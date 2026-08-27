import 'server-only'
import { createServiceClient } from '../supabase'
import { selectSourceIds, type SourceKind } from '../sources'
import type { Filters } from '../filters'

/**
 * The row shape, columns and per-user helpers every query surface shares.
 *
 * Split from the single lib/queries.ts in 4.4 (2026-08-24), same exports
 * through the barrel. This module must not import lib/events.ts —
 * lib/events.ts imports EventRow from here, and keeping this file at the
 * bottom of the graph is what keeps that a type-only, cycle-free edge.
 */

export interface EventRow {
  id: string
  source_id: string
  title: string
  description: string | null
  url: string
  image_url: string | null
  organizer: string | null
  starts_at_local: string | null
  ends_at_local: string | null
  starts_at: string | null
  registration_deadline: string | null
  date_precision: string | null
  date_kind: string | null
  is_online: boolean
  city: string | null
  area: string | null
  venue: string | null
  event_type: string | null
  tags: string[]
  price_type: string
  price_amount: number | null
  relevance_score: number | null
  relevance_reason: string | null
  /** Per-user: null means THIS user has not seen it. Merged from
   *  user_event_seen, no longer a column on events. */
  seen_at: string | null
  status: string
  /** Per-user, merged from user_event_actions. */
  action_state?: string | null
  title_norm?: string | null
  /** How many near-identical listings this card stands for (>= 1). */
  duplicate_count?: number
  /** Per-user fit, attached by lib/ranking.ts on the feed. */
  fit?: { score: number; reasons: string[]; rank: number | null }
}

export const EVENT_COLUMNS =
  'id, source_id, title, description, url, image_url, organizer, starts_at_local, ends_at_local, ' +
  'starts_at, registration_deadline, date_precision, date_kind, is_online, city, area, ' +
  'venue, event_type, tags, price_type, price_amount, relevance_score, relevance_reason, ' +
  'title_norm, status'

export interface SourceHealth {
  id: string
  display_name: string
  enabled: boolean
  /** 'deadlines' sources feed /hackathons, not the feed. */
  kind: 'events' | 'deadlines'
  event_count: number
  last_ok_at: string | null
  last_status: string | null
  /** Muted by the current user (per-user lists skip it). */
  muted?: boolean
}

/**
 * Events scoring below this never appear in the default view.
 *
 * They are still stored and still visible in the low-relevance drawer -- the
 * rule is never to delete, not never to hide. But a feed with concerts and
 * marathons sitting in it is one you stop opening, so the floor is the point.
 */
export const RELEVANCE_FLOOR = 40

export const PAGE_SIZE = 30

export interface EventList {
  rows: EventRow[]
  total: number
  page: number
  pageSize: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Applies the URL filter state to a query.
 *
 * Typed loosely on purpose: supabase-js builder generics do not survive being
 * passed through a helper, and the alternative is duplicating this chain at
 * every call site.
 */
export function applyFilters(query: any, filters: Filters, nowIso: string): any {
  let q = query

  // Demo posture, 2026-08-28: a listing with no banner renders as a pastel
  // date block, and five of those scattered through twenty real banners read
  // as broken cards rather than as a deliberate fallback. Filtering here
  // rather than in EventCard keeps the counts honest -- every list selects
  // with `count: 'exact'` on this same builder, so the "N open entries"
  // subtitle and the pagination agree with what is on screen. Detail routes
  // do not pass through here, so an imageless event stays reachable by URL
  // and a squad pointed at one keeps its working event link. A `manual`
  // source event (lib/pipeline/manual.ts) has no image and so is hidden too.
  q = q.not('image_url', 'is', null)

  // The relevance floor is skipped when the user explicitly asks to see the
  // low-scoring pile, which is the whole point of keeping those rows.
  if (!filters.showLow) {
    q = q.or(`relevance_score.gte.${RELEVANCE_FLOOR},relevance_score.is.null`)
  }
  if (filters.source) q = q.eq('source_id', filters.source)
  if (filters.topOnly) q = q.gte('relevance_score', 80)
  if (filters.offlineOnly) q = q.eq('is_online', false)
  if (filters.freeOnly) q = q.eq('price_type', 'free')

  if (filters.when !== 'all') {
    const days = filters.when === 'week' ? 7 : 30
    q = q.lte('starts_at', new Date(Date.parse(nowIso) + days * 86_400_000).toISOString())
  }

  if (filters.q) {
    // Escaped because a comma or parenthesis would otherwise break out of
    // PostgREST's `or` filter syntax.
    const term = filters.q.replace(/[,()]/g, ' ').trim()
    if (term) {
      q = q.or(
        `title.ilike.%${term}%,organizer.ilike.%${term}%,venue.ilike.%${term}%,description.ilike.%${term}%`,
      )
    }
  }

  return q
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Per-user state for a set of event ids: what they decided (action) and
 * whether they have seen it. Returns a mapper that stamps both onto a row.
 */
export async function userStateFor(
  userId: string,
  ids: string[],
): Promise<(e: EventRow) => EventRow> {
  const db = createServiceClient()
  const actionByEvent = new Map<string, string>()
  const seenByEvent = new Map<string, string>()
  if (ids.length) {
    const [{ data: actions }, { data: seenRows }] = await Promise.all([
      db
        .from('user_event_actions')
        .select('event_id, state')
        .eq('user_id', userId)
        .in('event_id', ids),
      db
        .from('user_event_seen')
        .select('event_id, seen_at')
        .eq('user_id', userId)
        .in('event_id', ids),
    ])
    for (const a of actions ?? []) actionByEvent.set(a.event_id as string, a.state as string)
    for (const r of seenRows ?? []) seenByEvent.set(r.event_id as string, r.seen_at as string)
  }
  return (e) => ({
    ...e,
    action_state: actionByEvent.get(e.id) ?? null,
    seen_at: seenByEvent.get(e.id) ?? null,
  })
}

/**
 * Collapse near-identical listings into one card.
 *
 * The same pitch day shows up four times with different Luma URLs, and the
 * same meetup appears on AllEvents and a Luma calendar. Grouping key is the
 * normalised title plus the calendar day; the list arrives ranked, so the
 * first row of each group is the best one and simply gains a count. Nothing
 * is deleted -- the collapsed rows are still in the database and still
 * reachable through search. Used by the feed and, since 2026-08-24, /events:
 * "see every listing" is served by the "+1 listing" badge, not by rendering
 * the same event twice side by side.
 */
export function collapseDuplicates(rows: EventRow[]): EventRow[] {
  const byKey = new Map<string, EventRow>()
  for (const row of rows) {
    const day = row.starts_at_local?.slice(0, 10) ?? row.starts_at?.slice(0, 10) ?? ''
    const key = `${row.title_norm ?? row.title.toLowerCase()}|${day}`
    const existing = byKey.get(key)
    if (existing) {
      existing.duplicate_count = (existing.duplicate_count ?? 1) + 1
      // A skip or save on ANY copy should reflect on the surviving card.
      if (!existing.action_state && row.action_state) {
        existing.action_state = row.action_state
      }
    } else {
      byKey.set(key, { ...row, duplicate_count: 1 })
    }
  }
  return [...byKey.values()]
}

/** Source ids this user has muted. Empty array when none. */
export async function mutedSourceIds(userId: string): Promise<string[]> {
  const db = createServiceClient()
  const { data } = await db.from('user_source_mutes').select('source_id').eq('user_id', userId)
  return (data ?? []).map((r) => r.source_id as string)
}

/**
 * Enabled sources minus the user's mutes -- the set every per-user list
 * draws from. Falls back to a sentinel so `.in()` never gets an empty array.
 *
 * `kind` splits dated events from entry deadlines (see config/sources.ts).
 * Every dated surface asks for 'events'; /hackathons asks for 'deadlines'.
 * The default is 'events', so a new caller cannot accidentally pull a
 * hundred national hackathons into a local list.
 */
export async function visibleSourceIds(
  userId: string,
  kind: SourceKind | 'all' = 'events',
): Promise<{ ids: string[]; filter: string[]; muted: string[] }> {
  const db = createServiceClient()
  const [{ data: enabled }, muted] = await Promise.all([
    db.from('sources').select('id').eq('enabled', true),
    mutedSourceIds(userId),
  ])
  const ids = selectSourceIds(
    (enabled ?? []).map((s) => s.id as string),
    muted,
    kind,
  )
  return { ids, filter: ids.length ? ids : ['__none__'], muted }
}
