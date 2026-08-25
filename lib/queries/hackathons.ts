import { createServiceClient } from '../supabase'
import type { Filters } from '../filters'
import {
  applyFilters,
  EVENT_COLUMNS,
  PAGE_SIZE,
  userStateFor,
  visibleSourceIds,
  type EventList,
  type EventRow,
} from './shared'

/**
 * Minimum score for an ONLINE entry on /hackathons. In-person entries are
 * already geo-restricted to Tamil Nadu and are not floored. See listHackathons.
 */
const ONLINE_FLOOR = 40

/**
 * The paginated list behind /hackathons -- open entries from the deadline
 * sources (Devpost, Unstop), soonest cutoff first.
 *
 * Keyed on `registration_deadline`, never on `starts_at`. That is the whole
 * point of the page: Devpost's `starts_at` is when the submission window
 * OPENED, so a hackathon you can enter today has a start in the past and is
 * invisible to every other list we have. "Open" here means the cutoff has not
 * passed; an entry whose window has not opened yet is still worth seeing
 * coming, so it is included.
 *
 * Rows with no deadline at all (`date_kind = 'tba'`) are excluded rather than
 * floated: without a cutoff there is nothing to rank them by and no claim we
 * can make about them being open.
 */
export async function listHackathons(
  userId: string,
  filters: Filters,
  opts: { page: number; pageSize?: number },
): Promise<EventList> {
  const db = createServiceClient()
  const pageSize = opts.pageSize ?? PAGE_SIZE
  const nowIso = new Date().toISOString()

  const { filter: sourceFilter } = await visibleSourceIds(userId, 'deadlines')

  const build = (from: number, to: number) => {
    let q = db
      .from('events')
      .select(EVENT_COLUMNS, { count: 'exact' })
      .eq('status', 'active')
      .in('source_id', sourceFilter)
      .not('registration_deadline', 'is', null)
      .gte('registration_deadline', nowIso)

    // `when` means "closes within N days" here, so it is applied to the
    // deadline rather than to `starts_at` -- and then withheld from
    // applyFilters, which would otherwise narrow on the start.
    if (filters.when !== 'all') {
      const days = filters.when === 'week' ? 7 : 30
      q = q.lte(
        'registration_deadline',
        new Date(Date.parse(nowIso) + days * 86_400_000).toISOString(),
      )
    }

    // The feed's relevance floor is not applied as-is: the scorer takes 25
    // points off anything online, so a real developer hackathon lands in the
    // thirties and would vanish from the very page that exists to list it.
    // Instead the two halves get the rule each deserves:
    //   in person -- no floor. Ingest already guarantees these are in Tamil
    //     Nadu (classifyGeo's requireLocal), so a local hackathon is worth
    //     showing whatever the model made of its title.
    //   online -- floor of 40. There is no travel cost to weigh against, so
    //     the only question is whether it is technical, and the model is
    //     reliable at the extremes: this keeps the AI and dev hackathons and
    //     drops the B-plan, branding, finance-case and aptitude-test pile
    //     that makes up most of Unstop's online volume.
    q = q.or(`is_online.eq.false,relevance_score.gte.${ONLINE_FLOOR},relevance_score.is.null`)
    return applyFilters(q, { ...filters, when: 'all', showLow: true }, nowIso)
      .order('registration_deadline', { ascending: true })
      .order('is_online', { ascending: true })
      .range(from, to) as Promise<{ data: EventRow[] | null; count: number | null }>
  }

  let page = Math.max(1, opts.page)
  let res = await build((page - 1) * pageSize, page * pageSize - 1)
  let total = res.count ?? 0
  // Same stale-link clamp as listEvents.
  if (page > 1 && !(res.data ?? []).length) {
    res = await build(0, pageSize - 1)
    total = res.count ?? 0
    const last = Math.max(1, Math.ceil(total / pageSize))
    page = last
    if (last > 1) res = await build((last - 1) * pageSize, last * pageSize - 1)
  }
  const rows = (res.data ?? []) as EventRow[]
  const stateOf = await userStateFor(
    userId,
    rows.map((e) => e.id),
  )
  return { rows: rows.map(stateOf), total, page, pageSize }
}
