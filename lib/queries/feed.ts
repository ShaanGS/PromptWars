import { createServiceClient } from '../supabase'
import { feedSourceIds, isDeadlineSource } from '../sources'
import { DEFAULT_FILTERS, type Filters } from '../filters'
import {
  applyFilters,
  collapseDuplicates,
  EVENT_COLUMNS,
  RELEVANCE_FLOOR,
  userStateFor,
  visibleSourceIds,
  type EventRow,
  type SourceHealth,
} from './shared'

export interface DashboardData {
  closingSoon: EventRow[]
  events: EventRow[]
  /** Total active events, so the UI never implies the cap is the whole set. */
  totalActive: number
  filteredCount: number
  unseenCount: number
  health: SourceHealth[]
}

/**
 * Until relevance scoring lands the ordering is just "soonest first", so
 * rendering hundreds of cards is a wall, not a dashboard. Cap it and say so --
 * a silent truncation reads as "this is everything" when it isn't.
 */
const LIST_LIMIT = 60

export async function getDashboardData(
  userId: string,
  filters: Filters = DEFAULT_FILTERS,
): Promise<DashboardData> {
  const db = createServiceClient()
  const nowIso = new Date().toISOString()
  const in7Days = new Date(Date.now() + 7 * 86_400_000).toISOString()

  // Only show events from currently-enabled sources. Disabling a source
  // therefore hides its events without deleting anything, and re-enabling
  // brings them straight back -- which is what "hackathons, but not now"
  // needs.
  // Enabled sources minus this user's mutes. A list of [] would make `.in()`
  // match nothing, which is correct, but Supabase needs a non-empty array.
  // 'all', not the default 'events': in Guild the deadline sources
  // (Devfolio, Devpost, Unstop) ARE the point -- a hackathon you can still
  // enter is exactly what a squad forms around, so the feed carries them
  // alongside dated meetups instead of routing them only to /hackathons.
  const { ids: enabledIds, muted } = await visibleSourceIds(userId, 'all')

  // Opt-in sources (see config/sources.ts) stay out of every feed query --
  // list, counts, closing soon -- unless their chip is the active filter, so
  // the numbers always describe what the feed is actually drawing from.
  const feedIds = feedSourceIds(enabledIds, filters.source)
  const sourceFilter = feedIds.length ? feedIds : ['__none__']

  // Ranked by relevance, then soonest. `nulls last` is not optional: Postgres
  // orders DESC as NULLS FIRST, so without it every unscored event would sit
  // at the very top of the dashboard.
  // Six independent reads, one round trip. `source_health` used to be awaited
  // after this block: it depends on nothing above it, so serialising it cost
  // the dashboard a whole extra round trip for no ordering it needed.
  const [
    { data: events },
    { data: closing },
    { count: filteredCount },
    { data: unseenCount },
    { count: totalActive },
    { data: healthRows },
  ] = await Promise.all([
    applyFilters(
      db
        .from('events')
        .select(EVENT_COLUMNS)
        .eq('status', 'active')
        .in('source_id', sourceFilter)
        .gte('starts_at', nowIso),
      filters,
      nowIso,
    )
      // Offline outranks online. An event you can physically walk into is
      // the point of this -- you meet people at it. An online listing is
      // worth seeing but should never push a Chennai meetup down the page.
      .order('is_online', { ascending: true })
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('starts_at', { ascending: true, nullsFirst: false })
      .limit(LIST_LIMIT),
    db
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', 'active')
      .in('source_id', sourceFilter)
      .not('registration_deadline', 'is', null)
      .gte('registration_deadline', nowIso)
      .lte('registration_deadline', in7Days)
      .order('is_online', { ascending: true })
      .order('registration_deadline', { ascending: true })
      .limit(8)
      .returns<EventRow[]>(),
    db
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('source_id', sourceFilter)
      .in('status', ['filtered_geo', 'filtered_quality']),
    db.rpc('unseen_active_count', {
      p_user: userId,
      p_floor: RELEVANCE_FLOOR,
      p_sources: feedIds,
    }),
    db
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('source_id', sourceFilter)
      .gte('starts_at', nowIso),
    // One round trip for the whole health strip. This used to be two queries
    // per source -- sixteen sequential round trips that dominated page latency.
    db.rpc('source_health'),
  ])

  const health: SourceHealth[] = (healthRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    display_name: r.display_name as string,
    enabled: Boolean(r.enabled),
    kind: isDeadlineSource(r.id as string) ? ('deadlines' as const) : ('events' as const),
    event_count: Number(r.event_count ?? 0),
    last_ok_at: (r.last_ok_at as string | null) ?? null,
    last_status: (r.last_status as string | null) ?? null,
    muted: muted.includes(r.id as string),
  }))

  // Merged rather than joined: a separate lookup keyed on the ids we already
  // have is simpler than a PostgREST embed, and these tables stay tiny.
  const eventRows = (events ?? []) as EventRow[]
  const closingRows = (closing ?? []) as EventRow[]
  const stateOf = await userStateFor(
    userId,
    [...eventRows, ...closingRows].map((e) => e.id),
  )
  const withState = (rows: EventRow[]) => rows.map(stateOf)

  // "Not for me" means not for me. Skipped events stay in the database and
  // reappear the moment the choice is undone, but they leave the feed --
  // otherwise you re-triage the same listings on every visit.
  const notSkipped = (rows: EventRow[]) => rows.filter((e) => e.action_state !== 'skipped')

  const closingIds = new Set(closingRows.map((e) => e.id))

  return {
    closingSoon: notSkipped(withState(closingRows)),
    // Don't show the same event twice on one screen.
    events: collapseDuplicates(
      notSkipped(withState(eventRows.filter((e) => !closingIds.has(e.id)))),
    ),
    totalActive: totalActive ?? 0,
    filteredCount: filteredCount ?? 0,
    unseenCount: Number(unseenCount ?? 0),
    health,
  }
}
