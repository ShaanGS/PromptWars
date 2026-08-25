/**
 * Ingest one source, end to end.
 *
 *   npm run ingest -- devpost
 *
 * Runs on GitHub Actions, not Vercel. Vercel Hobby caps functions at 300s,
 * which AllEvents alone cannot fit inside at a 10s crawl delay, and the
 * scoring pass needs minutes more.
 *
 * Pipeline: reap stale runs -> claim a run -> fetch -> persist raw ->
 * normalise -> quality gates -> upsert events.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getConnector, listConnectorIds } from '@/lib/connectors'
import type { PartialEvent, RawListing } from '@/lib/connectors/types'
import { SOURCES_BY_ID } from '@/config/sources'
import { NORMALIZER_VERSION } from '@/config/interest-profile'
import { createFetcher, HttpError } from '@/lib/http/fetcher'
import { createServiceClient } from '@/lib/supabase'
import { contentHash, scoringHash } from '@/lib/hash'
import { evaluateGates } from '@/lib/pipeline/quality'
import { classifyGeo } from '@/lib/pipeline/geo'
import { canonicalizeUrl, inferArea, normalizeOrganizer, normalizeTitle } from '@/lib/text'

const STALE_RUN_MINUTES = 10
const MAX_LISTINGS_PER_RUN = 400

/**
 * A run left in `running` by a crash or a timeout would otherwise sit there
 * forever, and the health strip would show a permanently broken scraper as
 * *busy* rather than failed.
 */
async function reapStaleRuns(db: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUN_MINUTES * 60_000).toISOString()
  const { data, error } = await db
    .from('scrape_runs')
    .update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error: `run exceeded ${STALE_RUN_MINUTES} minutes without finishing; assumed crashed or timed out`,
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id')
  if (error) throw new Error(`reaping stale runs: ${error.message}`)
  return data?.length ?? 0
}

function toRow(sourceId: string, raw: RawListing, e: PartialEvent) {
  // National sources must prove an in-person listing is in Tamil Nadu; local
  // sources keep anything not positively elsewhere. See classifyGeo.
  const geo = classifyGeo(e, {
    requireLocal: SOURCES_BY_ID.get(sourceId)?.kind === 'deadlines',
  })
  return {
    source_id: sourceId,
    source_uid: raw.sourceUid,
    title: e.title,
    title_norm: normalizeTitle(e.title),
    description: e.description ?? null,
    url: e.url,
    canonical_url: canonicalizeUrl(e.canonicalUrl ?? e.url),
    image_url: e.imageUrl ?? null,
    organizer: e.organizer ?? null,
    organizer_norm: normalizeOrganizer(e.organizer),
    starts_at_local: e.startsAtLocal ?? null,
    ends_at_local: e.endsAtLocal ?? null,
    tz: e.tz ?? 'Asia/Kolkata',
    starts_at: e.startsAt ? e.startsAt.toISOString() : null,
    ends_at: e.endsAt ? e.endsAt.toISOString() : null,
    registration_deadline: e.registrationDeadline ? e.registrationDeadline.toISOString() : null,
    date_precision: e.datePrecision ?? 'unknown',
    date_kind: e.dateKind ?? 'start',
    is_online: e.isOnline ?? false,
    city: e.city ?? null,
    area: inferArea(e.venue),
    venue: e.venue ?? null,
    event_type: e.eventType ?? null,
    tags: e.tags ?? [],
    price_type: e.priceType ?? 'unknown',
    price_amount: e.priceAmount ?? null,
    price_currency: e.priceCurrency ?? null,
    content_hash: scoringHash({
      title: e.title,
      description: e.description,
      tags: e.tags,
      eventType: e.eventType,
    }),
    status: geo,
    last_seen_at: new Date().toISOString(),
  }
}

async function main() {
  assertProdWritesAllowed('ingest')
  const args = process.argv.slice(2)
  // Deliberate override, e.g. after adding calendars to the Luma config.
  const allowVolumeChange = args.includes('--force')
  const sourceId = args.find((a) => !a.startsWith('--'))
  if (!sourceId) {
    console.error('usage: npm run ingest -- <source> [--force]')
    console.error(`known: ${listConnectorIds().join(', ')}`)
    process.exit(1)
  }

  const connector = getConnector(sourceId)
  const config = SOURCES_BY_ID.get(sourceId)
  if (!config) throw new Error(`No config entry for "${sourceId}" in config/sources.ts`)

  const db = createServiceClient()

  const reaped = await reapStaleRuns(db)
  if (reaped) console.log(`reaped ${reaped} stale run(s)`)

  // The partial unique index on scrape_runs(source_id) where status='running'
  // makes this the concurrency guard: a second concurrent run cannot claim
  // one, so a manual trigger racing a scheduled one can't double-spend.
  const { data: run, error: runErr } = await db
    .from('scrape_runs')
    .insert({ source_id: sourceId, status: 'running' })
    .select('id')
    .single()
  if (runErr) {
    if (runErr.code === '23505') {
      console.error(`A run for "${sourceId}" is already in progress. Exiting.`)
      process.exit(0)
    }
    throw new Error(`claiming run: ${runErr.message}`)
  }
  const runId = run.id as number
  console.log(`run #${runId} for ${config.displayName}`)

  const finish = async (
    status: 'ok' | 'partial' | 'error',
    fields: Record<string, unknown> = {},
  ) => {
    await db
      .from('scrape_runs')
      .update({ status, finished_at: new Date().toISOString(), ...fields })
      .eq('id', runId)
  }

  try {
    const { data: sourceRow } = await db
      .from('sources')
      .select('cursor')
      .eq('id', sourceId)
      .single()

    const get = createFetcher({
      crawlDelayMs: config.crawlDelayMs,
      userAgent: config.userAgent,
    })

    const result = await connector.fetchRaw({
      cursor: (sourceRow?.cursor as Record<string, unknown>) ?? {},
      maxListings: MAX_LISTINGS_PER_RUN,
      get,
      log: (m) => console.log(`  [fetch] ${m}`),
    })
    console.log(`fetched ${result.listings.length} listings (done=${result.done})`)

    // --- persist raw, always. A re-run is a no-op thanks to the unique key,
    // and these rows are what make a later prompt fix replayable.
    const rawRows = result.listings.map((raw) => ({
      source_id: sourceId,
      source_uid: raw.sourceUid,
      run_id: runId,
      payload: raw.payload as object,
      content_hash: contentHash(raw.payload, connector.volatileFields),
      // Stamped so a later extraction fix can replay stored payloads by
      // version rather than by a null check, which never matches once a row
      // has been normalised even once.
      normalizer_version: NORMALIZER_VERSION,
      normalized_at: new Date().toISOString(),
    }))
    if (rawRows.length) {
      const { error } = await db.from('raw_listings').upsert(rawRows, {
        onConflict: 'source_id,source_uid,content_hash',
        ignoreDuplicates: true,
      })
      if (error) throw new Error(`persisting raw listings: ${error.message}`)
    }

    // --- normalise
    if (!connector.toEvent) {
      await finish('partial', {
        listings_found: result.listings.length,
        error: 'LLM normalisation path not implemented yet',
      })
      console.log('connector needs the LLM path, which is not built yet. Raw stored.')
      return
    }

    const parsed: PartialEvent[] = []
    let dropped = 0
    const pairs: Array<{ raw: RawListing; event: PartialEvent }> = []
    for (const raw of result.listings) {
      const event = connector.toEvent(raw)
      if (!event) {
        dropped++
        continue
      }
      parsed.push(event)
      pairs.push({ raw, event })
    }

    // --- gates
    const { data: history } = await db
      .from('scrape_runs')
      .select('listings_found')
      .eq('source_id', sourceId)
      .eq('status', 'ok')
      .order('started_at', { ascending: false })
      .limit(5)

    const { data: existing } = await db
      .from('events')
      .select('source_uid, content_hash')
      .eq('source_id', sourceId)

    const existingByUid = new Map(
      (existing ?? []).map((r) => [r.source_uid as string, r.content_hash as string]),
    )
    let churnRatio: number | null = null
    if (existingByUid.size) {
      let changed = 0
      for (const { raw, event } of pairs) {
        const prev = existingByUid.get(raw.sourceUid)
        if (!prev) continue
        const next = scoringHash({
          title: event.title,
          description: event.description,
          tags: event.tags,
          eventType: event.eventType,
        })
        if (prev !== next) changed++
      }
      churnRatio = changed / existingByUid.size
    }

    const gates = evaluateGates({
      parsed,
      droppedCount: dropped,
      trailingCounts: (history ?? []).map((h) => h.listings_found as number).filter(Boolean),
      everReturnedRows: (history ?? []).length > 0,
      churnRatio,
      zeroIsNormal: SOURCES_BY_ID.get(sourceId)?.sparse,
      allowVolumeChange,
    })

    console.log('\nquality gates:')
    for (const [name, c] of Object.entries(gates.checks)) {
      console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${name.padEnd(10)} ${c.detail}`)
    }

    if (!gates.pass) {
      await finish(gates.status, {
        listings_found: result.listings.length,
        quality_gate: gates.checks,
        error: 'quality gates failed; events were NOT upserted',
      })
      console.error('\nGates failed. Raw payloads kept, events not written.')
      process.exit(1)
    }

    // --- upsert. first_seen_at and seen_at are deliberately omitted so an
    // update never resets them: first_seen_at is what makes a returning
    // annual event detectable, seen_at is what drives the NEW badge.
    const rows = pairs.map(({ raw, event }) => toRow(sourceId, raw, event))
    const { error: upsertErr } = await db
      .from('events')
      .upsert(rows, { onConflict: 'source_id,source_uid' })
    if (upsertErr) throw new Error(`upserting events: ${upsertErr.message}`)

    await db.from('sources').update({ cursor: result.cursor }).eq('id', sourceId)

    // First backfill: mark everything already seen.
    //
    // Otherwise the entire initial corpus carries the NEW badge, which makes
    // it noise on day one and meaningless every day after -- you learn to
    // ignore a marker that was never once informative. From here on, "new"
    // genuinely means "appeared since you last looked".
    const { data: state } = await db
      .from('app_state')
      .select('first_backfill_done')
      .eq('id', 1)
      .single()

    if (state && !state.first_backfill_done) {
      const { count } = await db
        .from('events')
        .update({ seen_at: new Date().toISOString() }, { count: 'exact' })
        .is('seen_at', null)
      await db.from('app_state').update({ first_backfill_done: true }).eq('id', 1)
      console.log(`first backfill: marked ${count ?? 0} existing events as seen`)
    }

    await finish(result.done ? 'ok' : 'partial', {
      listings_found: result.listings.length,
      quality_gate: gates.checks,
    })

    const active = rows.filter((r) => r.status === 'active').length
    console.log(
      `\nupserted ${rows.length} events (${active} in scope, ${rows.length - active} filtered_geo, ${dropped} dropped)`,
    )
  } catch (err) {
    const detail =
      err instanceof HttpError
        ? `${err.message}\n--- body ---\n${err.bodySnippet}`
        : err instanceof Error
          ? `${err.message}\n${err.stack ?? ''}`
          : String(err)
    await finish('error', {
      error: detail.slice(0, 8000),
      http_status: err instanceof HttpError ? err.status : null,
    })
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
