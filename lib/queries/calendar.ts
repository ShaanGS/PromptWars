import { createServiceClient } from '../supabase'
import { effectiveInstant, effectiveLocal, isDeadlineEvent } from '../events'
import { EVENT_COLUMNS, visibleSourceIds, type EventRow } from './shared'

/**
 * Events for the calendar in [from, to).
 *
 * `mine` is what you said yes to (interested / registered / going /
 * attended) -- the calendar's reason to exist. `all` adds every active
 * event from enabled sources at or above the open feed tiers (score >= 60)
 * so the same view doubles as a planning surface. Your own events always
 * come back regardless of score. Range-filtered on the derived `starts_at`
 * instant, rendered from `starts_at_local` like everywhere else.
 */
export async function getCalendarEvents(
  userId: string,
  fromIso: string,
  toIso: string,
  scope: 'mine' | 'all',
): Promise<EventRow[]> {
  const db = createServiceClient()

  const { data: actions } = await db
    .from('user_event_actions')
    .select('event_id, state')
    .eq('user_id', userId)
    .in('state', ['interested', 'registered', 'going', 'attended'])
  const stateById = new Map((actions ?? []).map((a) => [a.event_id as string, a.state as string]))
  const mineIds = [...stateById.keys()]

  const inRange = <Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(
    q: Q,
  ) => q.gte('starts_at', fromIso).lt('starts_at', toIso)

  const queries: Promise<{ data: EventRow[] | null }>[] = []
  if (mineIds.length) {
    // Deliberately NOT range-filtered in SQL. A deadline listing's `starts_at`
    // is when its submission window opened, so a hackathon you saved that
    // closes this week would be fetched for a week in July and never appear
    // on the week it matters. The set is bounded by what one person saved, so
    // it is filtered on the effective instant in TS below instead.
    queries.push(
      db.from('events').select(EVENT_COLUMNS).in('id', mineIds).returns<EventRow[]>() as never,
    )
  }
  if (scope === 'all') {
    const { filter: sourceFilter } = await visibleSourceIds(userId)
    queries.push(
      inRange(
        db
          .from('events')
          .select(EVENT_COLUMNS)
          .eq('status', 'active')
          .in('source_id', sourceFilter)
          .gte('relevance_score', 60),
      )
        .order('starts_at', { ascending: true })
        .limit(400)
        .returns<EventRow[]>() as never,
    )
  }

  const results = await Promise.all(queries)
  const byId = new Map<string, EventRow>()
  for (const { data } of results) for (const e of data ?? []) byId.set(e.id, e)

  return [...byId.values()]
    .map((e) => {
      // A deadline listing is placed on its cutoff -- that is the day it
      // costs you something. Rewritten here rather than in every calendar
      // component so the grid, the day agenda and the sheet all agree.
      const at = effectiveInstant(e)
      const local = effectiveLocal(e)
      return {
        ...e,
        starts_at: at,
        starts_at_local: local,
        ends_at_local: isDeadlineEvent(e) ? null : e.ends_at_local,
        action_state: stateById.get(e.id) ?? null,
        seen_at: e.seen_at ?? new Date().toISOString(),
      }
    })
    .filter((e) => e.starts_at !== null && e.starts_at >= fromIso && e.starts_at < toIso)
    .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
}
