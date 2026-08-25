/**
 * Run a connector against the LIVE site and print what it parsed.
 *
 *   npm run connector:test -- devpost
 *
 * Touches no database. Fixture snapshots catch regressions in our code; only
 * this catches the remote site changing under us, which is the failure mode
 * that actually happens. A weekly CI job runs it for every source.
 */
import { getConnector, listConnectorIds } from '@/lib/connectors'
import { SOURCES_BY_ID } from '@/config/sources'
import { createFetcher } from '@/lib/http/fetcher'
import { contentHash } from '@/lib/hash'

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error(`usage: npm run connector:test -- <source>`)
    console.error(`known connectors: ${listConnectorIds().join(', ')}`)
    process.exit(1)
  }

  const connector = getConnector(id)
  const config = SOURCES_BY_ID.get(id)
  if (!config) throw new Error(`No config entry for source "${id}" in config/sources.ts`)

  const get = createFetcher({
    crawlDelayMs: config.crawlDelayMs,
    userAgent: config.userAgent,
  })

  console.log(`\n=== ${config.displayName} (${id}) ===`)
  console.log(`user-agent : ${config.userAgent.slice(0, 60)}...`)
  console.log(`crawl delay: ${config.crawlDelayMs}ms\n`)

  const started = Date.now()
  const result = await connector.fetchRaw({
    cursor: {},
    maxListings: 100,
    get,
    log: (m) => console.log(`  [fetch] ${m}`),
  })

  console.log(`\nfetched ${result.listings.length} listings in ${Date.now() - started}ms`)
  console.log(`done=${result.done} cursor=${JSON.stringify(result.cursor)}\n`)

  if (!connector.toEvent) {
    console.log('(connector uses the LLM path; no deterministic mapper to exercise)')
    return
  }

  let parsed = 0
  let dated = 0
  let dropped = 0

  for (const raw of result.listings) {
    const event = connector.toEvent(raw)
    if (!event) {
      dropped++
      continue
    }
    parsed++
    if (event.startsAtLocal || event.registrationDeadline) dated++
  }

  console.log('--- first 3 parsed events ---')
  for (const raw of result.listings.slice(0, 3)) {
    const e = connector.toEvent(raw)
    if (!e) continue
    console.log({
      sourceUid: raw.sourceUid,
      title: e.title,
      startsAtLocal: e.startsAtLocal,
      endsAtLocal: e.endsAtLocal,
      datePrecision: e.datePrecision,
      dateKind: e.dateKind,
      isOnline: e.isOnline,
      city: e.city,
      tags: e.tags,
      organizer: e.organizer,
      hash: contentHash(raw.payload, connector.volatileFields).slice(0, 12),
    })
  }

  // The quality signal. A parser that silently returns rows with empty
  // titles and no dates passes a count check and quietly poisons everything
  // downstream, so surface the ratios rather than just the total.
  console.log('\n--- quality ---')
  console.log(`parsed         : ${parsed}/${result.listings.length}`)
  console.log(`dropped        : ${dropped}`)
  console.log(`with a date    : ${dated}/${parsed}`)

  if (parsed === 0) {
    // Sparse sources (Bevy chapters) legitimately sit at zero between
    // events; the fetch succeeding is the health signal there.
    if (config.sparse) {
      console.log('\nOK (0 events; sparse source, normal between events)')
      return
    }
    console.error('\nFAIL: connector parsed zero events.')
    process.exit(1)
  }
  if (dated / parsed < 0.6) {
    console.error(
      `\nFAIL: only ${Math.round((dated / parsed) * 100)}% have a parseable date (need 60%).`,
    )
    process.exit(1)
  }
  console.log('\nOK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
