/**
 * The weekly discovery sweep.
 *
 *   npm run discover
 *
 * Runs each config/discovery.ts query through Google's Custom Search JSON
 * API and upserts the results as `discovery_leads` for review at
 * /admin/discovery. Leads, never events: a search snippet routinely
 * describes last year's edition, so a human confirms every field via
 * paste-to-event before anything reaches the feed.
 *
 * The URL unique index makes re-runs idempotent — and, importantly, a
 * dismissed lead stays dismissed (`ignoreDuplicates`), so the sweep never
 * resurfaces what the admin already ruled out.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import { DISCOVERY_QUERIES } from '@/config/discovery'
import { toLeads, type CseItem } from '@/lib/discovery'
import { createServiceClient } from '@/lib/supabase'

const ENDPOINT = 'https://www.googleapis.com/customsearch/v1'

async function search(key: string, cx: string, query: string): Promise<CseItem[]> {
  const url = `${ENDPOINT}?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=10&gl=in`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CSE ${res.status} for "${query}": ${(await res.text()).slice(0, 300)}`)
  }
  const body = (await res.json()) as { items?: CseItem[] }
  return body.items ?? []
}

async function main() {
  assertProdWritesAllowed('discover')

  const key = process.env.GOOGLE_CSE_KEY
  const cx = process.env.GOOGLE_CSE_CX
  // Skipping, not failing: the sweep is an optional feeder for the leads
  // queue, and Google's CSE provisioning fought us for an evening
  // (2026-08-24). A weekly red X for a feature nobody is blocked on trains
  // you to ignore the workflow list -- so no keys means a clean no-op.
  if (!key || !cx) {
    console.log('GOOGLE_CSE_KEY / GOOGLE_CSE_CX not set -- skipping the sweep.')
    console.log('Leads can still arrive by hand; /admin/add takes any pasted post.')
    return
  }

  const db = createServiceClient()
  let found = 0
  let inserted = 0

  for (const query of DISCOVERY_QUERIES) {
    let items: CseItem[]
    try {
      items = await search(key, cx, query)
    } catch (err) {
      // One quota-hit or bad query must not sink the sweep.
      console.error(`  FAILED ${query}: ${err instanceof Error ? err.message : err}`)
      continue
    }
    const leads = toLeads(query, items)
    found += leads.length

    if (leads.length) {
      const { data, error } = await db
        .from('discovery_leads')
        .upsert(leads, { onConflict: 'url', ignoreDuplicates: true })
        .select('id')
      if (error) throw new Error(`saving leads: ${error.message}`)
      inserted += data?.length ?? 0
    }
    console.log(`  ${query} -> ${leads.length} leads`)
    // Polite pacing; also keeps a burst well under any per-minute limit.
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\n${DISCOVERY_QUERIES.length} queries, ${found} leads seen, ${inserted} new`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
