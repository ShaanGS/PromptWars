/**
 * Re-run geo classification over events already in the table.
 *
 *   npm run reclassify -- unstop
 *   npm run reclassify -- --all --dry
 *
 * Ingest re-stamps `status` only for listings a run actually re-fetched, and
 * a run is capped at MAX_LISTINGS_PER_RUN. Unstop publishes about 500 open
 * opportunities, so a single run cannot see them all and rows classified
 * under an older rule keep their old verdict indefinitely. That is what this
 * fixes: when the rule changes, apply it to what is already stored.
 *
 * Only ever moves rows between `active` and `filtered_geo`. `filtered_quality`
 * and anything archived are left alone -- this is not a general repair tool.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import { SOURCES, SOURCES_BY_ID } from '@/config/sources'
import { classifyGeo } from '@/lib/pipeline/geo'
import { createServiceClient } from '@/lib/supabase'

const GEO_STATUSES = ['active', 'filtered_geo']

async function reclassify(sourceId: string, dryRun: boolean) {
  const config = SOURCES_BY_ID.get(sourceId)
  if (!config) throw new Error(`No config entry for "${sourceId}" in config/sources.ts`)
  const db = createServiceClient()

  const { data: rows, error } = await db
    .from('events')
    .select('id, title, description, venue, city, is_online, status')
    .eq('source_id', sourceId)
    .in('status', GEO_STATUSES)
  if (error) throw new Error(`loading ${sourceId} events: ${error.message}`)

  const requireLocal = config.kind === 'deadlines'
  const changes: Array<{ id: string; from: string; to: string; title: string }> = []

  for (const r of rows ?? []) {
    const verdict = classifyGeo(
      {
        isOnline: Boolean(r.is_online),
        city: r.city as string | null,
        venue: r.venue as string | null,
        title: r.title as string,
        description: r.description as string | null,
      },
      { requireLocal },
    )
    if (verdict !== r.status) {
      changes.push({
        id: r.id as string,
        from: r.status as string,
        to: verdict,
        title: r.title as string,
      })
    }
  }

  console.log(
    `${sourceId}: ${rows?.length ?? 0} rows, ${changes.length} would change` +
      (requireLocal ? ' (requireLocal)' : ''),
  )
  for (const c of changes.slice(0, 15)) {
    console.log(`  ${c.from} -> ${c.to}  ${c.title.slice(0, 70)}`)
  }
  if (changes.length > 15) console.log(`  ... and ${changes.length - 15} more`)

  if (dryRun || !changes.length) return changes.length

  // Grouped into two updates rather than one per row.
  for (const target of GEO_STATUSES) {
    const ids = changes.filter((c) => c.to === target).map((c) => c.id)
    if (!ids.length) continue
    const { error: updErr } = await db.from('events').update({ status: target }).in('id', ids)
    if (updErr) throw new Error(`updating to ${target}: ${updErr.message}`)
    console.log(`  wrote ${ids.length} -> ${target}`)
  }
  return changes.length
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry')
  if (!dryRun) assertProdWritesAllowed('reclassify')
  const all = args.includes('--all')
  const ids = all ? SOURCES.map((s) => s.id) : args.filter((a) => !a.startsWith('--'))

  if (!ids.length) {
    console.error('usage: npm run reclassify -- <source> [--dry]   |   -- --all [--dry]')
    process.exit(1)
  }

  let total = 0
  for (const id of ids) total += await reclassify(id, dryRun)
  console.log(`\n${dryRun ? 'would change' : 'changed'} ${total} row(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
