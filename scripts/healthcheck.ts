/**
 * Does two jobs, both about noticing that the system has stopped working.
 *
 * 1. Touch the database, so Supabase's free tier does not pause the project
 *    after 7 days of low activity.
 * 2. Fail loudly if an enabled source has no successful run in 48 hours.
 *
 * Exits non-zero on a stale source, which is what makes the workflow open an
 * issue. The in-app health strip only works if you open the app -- and you
 * stop opening an app that looks empty, which is exactly when it is broken.
 */
import './load-env'
import { createServiceClient } from '@/lib/supabase'

const STALE_HOURS = 48

async function main() {
  const db = createServiceClient()

  // The keep-alive. A real query against a real table, not a health endpoint.
  const { count, error: pingErr } = await db
    .from('events')
    .select('*', { count: 'exact', head: true })
  if (pingErr) throw new Error(`keep-alive query failed: ${pingErr.message}`)
  console.log(`keep-alive ok (${count ?? 0} events)`)

  const { data: sources, error } = await db
    .from('sources')
    .select('id, display_name')
    .eq('enabled', true)
  if (error) throw new Error(`loading sources: ${error.message}`)

  const cutoff = new Date(Date.now() - STALE_HOURS * 3_600_000).toISOString()
  const stale: string[] = []

  for (const source of sources ?? []) {
    // No scraper behind it, so "no run in 48h" is its normal state, not an
    // outage. Its runs are hand-adds (/admin/add).
    if (source.id === 'manual') continue
    const { data: lastOk } = await db
      .from('scrape_runs')
      .select('finished_at')
      .eq('source_id', source.id)
      .in('status', ['ok', 'partial'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const when = lastOk?.finished_at as string | undefined
    const ok = Boolean(when && when > cutoff)
    console.log(`  ${ok ? 'OK  ' : 'STALE'} ${source.id.padEnd(18)} last ok: ${when ?? 'never'}`)
    if (!ok) stale.push(source.display_name as string)
  }

  if (stale.length) {
    console.error(
      `\n${stale.length} source(s) with no successful run in ${STALE_HOURS}h: ${stale.join(', ')}`,
    )
    process.exit(1)
  }
  console.log('\nall enabled sources healthy')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
