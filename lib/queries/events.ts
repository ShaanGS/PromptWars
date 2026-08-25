import { createServiceClient } from '../supabase'
import type { Filters } from '../filters'
import {
  applyFilters,
  collapseDuplicates,
  EVENT_COLUMNS,
  PAGE_SIZE,
  userStateFor,
  visibleSourceIds,
  type EventList,
  type EventRow,
} from './shared'

/**
 * The flat, paginated list behind /events -- every active upcoming event
 * from enabled sources, the same filters as the feed, no tiers. Duplicates
 * collapse within the page (the "+1 listing" badge carries the count), so
 * "every listing" no longer means the same event twice side by side.
 * `date` is soonest-first; `rank` is the feed's order.
 */
export async function listEvents(
  userId: string,
  filters: Filters,
  opts: { sort: 'date' | 'rank'; page: number; pageSize?: number },
): Promise<EventList> {
  const db = createServiceClient()
  const pageSize = opts.pageSize ?? PAGE_SIZE
  const nowIso = new Date().toISOString()

  const { filter: sourceFilter } = await visibleSourceIds(userId)

  const build = (from: number, to: number) => {
    let q = applyFilters(
      db
        .from('events')
        .select(EVENT_COLUMNS, { count: 'exact' })
        .eq('status', 'active')
        .in('source_id', sourceFilter)
        .gte('starts_at', nowIso),
      filters,
      nowIso,
    )
    q =
      opts.sort === 'rank'
        ? q
            .order('is_online', { ascending: true })
            .order('relevance_score', { ascending: false, nullsFirst: false })
            .order('starts_at', { ascending: true, nullsFirst: false })
        : q
            .order('starts_at', { ascending: true, nullsFirst: false })
            .order('relevance_score', { ascending: false, nullsFirst: false })
    return q.range(from, to) as Promise<{ data: EventRow[] | null; count: number | null }>
  }

  let page = Math.max(1, opts.page)
  let res = await build((page - 1) * pageSize, page * pageSize - 1)
  let total = res.count ?? 0
  // Clamp to what exists: a stale link to page 9 of a list that shrank to
  // 2 pages lands on the last page, not an empty one. PostgREST answers an
  // out-of-range range with 416 and no count, so re-read from page 1 and,
  // if there is more than one page, fetch the last. Only on stale links.
  if (page > 1 && !(res.data ?? []).length) {
    res = await build(0, pageSize - 1)
    total = res.count ?? 0
    const last = Math.max(1, Math.ceil(total / pageSize))
    page = last
    if (last > 1) res = await build((last - 1) * pageSize, last * pageSize - 1)
  }
  const data = res.data
  const rows = (data ?? []) as EventRow[]
  const stateOf = await userStateFor(
    userId,
    rows.map((e) => e.id),
  )
  return { rows: collapseDuplicates(rows.map(stateOf)), total, page, pageSize }
}
