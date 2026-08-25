import { DateTime } from 'luxon'
import { DEFAULT_TZ } from './dates/types'

/**
 * Calendar state and range math. Pure, tested, timezone-fixed.
 *
 * The URL is the state: `/calendar?view=week&date=2026-08-24&scope=mine`.
 * Every control on the page is a link to another URL, so the back button
 * works, a week can be shared, and nothing lives in client memory.
 *
 * Everything is Asia/Kolkata. Listings are normalised to it at ingest and
 * the audience is in it; rendering in the browser's zone would move a
 * Chennai meetup to the wrong day for anyone travelling.
 */
export type CalendarView = 'day' | 'week' | 'month'
export type CalendarScope = 'mine' | 'all'

export interface CalendarState {
  view: CalendarView
  /** ISO date, YYYY-MM-DD, the anchor day. */
  date: string
  scope: CalendarScope
}

export const VIEWS: CalendarView[] = ['day', 'week', 'month']

export function todayIso(tz = DEFAULT_TZ): string {
  return DateTime.now().setZone(tz).toISODate()!
}

/** Parse searchParams into a state, falling back to week / today / mine. */
export function parseCalendarState(
  params: Record<string, string | string[] | undefined>,
  tz = DEFAULT_TZ,
): CalendarState {
  const pick = (k: string) => {
    const v = params[k]
    return Array.isArray(v) ? v[0] : v
  }
  const view = pick('view')
  const scope = pick('scope')
  const date = pick('date')
  const parsed = date ? DateTime.fromISO(date, { zone: tz }) : null
  return {
    view: VIEWS.includes(view as CalendarView) ? (view as CalendarView) : 'week',
    date: parsed?.isValid ? parsed.toISODate()! : todayIso(tz),
    scope: scope === 'all' ? 'all' : 'mine',
  }
}

/** Build the href for a state. Defaults are omitted so the clean URL is `/calendar`. */
export function calendarHref(state: CalendarState, tz = DEFAULT_TZ): string {
  const p = new URLSearchParams()
  if (state.view !== 'week') p.set('view', state.view)
  if (state.date !== todayIso(tz)) p.set('date', state.date)
  if (state.scope !== 'mine') p.set('scope', state.scope)
  const q = p.toString()
  return q ? `/calendar?${q}` : '/calendar'
}

export interface DateRange {
  /** Inclusive, start of day. */
  start: DateTime
  /** Exclusive, start of the day after the last day. */
  end: DateTime
}

/**
 * The visible range for a view around the anchor date. Weeks start on
 * Monday (luxon's default, and the Indian working week). Month view pads
 * to whole weeks so the grid is always 7 × n.
 */
export function rangeFor(view: CalendarView, dateIso: string, tz = DEFAULT_TZ): DateRange {
  const anchor = DateTime.fromISO(dateIso, { zone: tz }).startOf('day')
  switch (view) {
    case 'day':
      return { start: anchor, end: anchor.plus({ days: 1 }) }
    case 'week': {
      const start = anchor.startOf('week')
      return { start, end: start.plus({ weeks: 1 }) }
    }
    case 'month': {
      const first = anchor.startOf('month')
      const start = first.startOf('week')
      const last = first.endOf('month').startOf('day')
      const end = last.startOf('week').plus({ weeks: 1 })
      return { start, end }
    }
  }
}

/** Anchor date after stepping one unit forward (+1) or back (-1). */
export function stepDate(
  view: CalendarView,
  dateIso: string,
  dir: 1 | -1,
  tz = DEFAULT_TZ,
): string {
  const anchor = DateTime.fromISO(dateIso, { zone: tz })
  const unit = view === 'day' ? { days: dir } : view === 'week' ? { weeks: dir } : { months: dir }
  return anchor.plus(unit).toISODate()!
}

/** Header label: "Monday 24 Aug" / "24 – 30 Aug" / "August 2026". */
export function rangeLabel(view: CalendarView, dateIso: string, tz = DEFAULT_TZ): string {
  const anchor = DateTime.fromISO(dateIso, { zone: tz })
  if (view === 'day') return anchor.toFormat('cccc d LLL')
  if (view === 'month') return anchor.toFormat('LLLL yyyy')
  const { start, end } = rangeFor('week', dateIso, tz)
  const last = end.minus({ days: 1 })
  if (start.hasSame(last, 'month')) return `${start.toFormat('d')} – ${last.toFormat('d LLL')}`
  return `${start.toFormat('d LLL')} – ${last.toFormat('d LLL')}`
}

/** Every day in a range, as ISO dates. */
export function daysIn(range: DateRange): string[] {
  const out: string[] = []
  for (let d = range.start; d < range.end; d = d.plus({ days: 1 })) out.push(d.toISODate()!)
  return out
}

/** The minimal shape the calendar needs from an event. */
export interface CalendarEventLike {
  starts_at_local: string | null
  ends_at_local: string | null
  date_precision: string | null
  date_kind: string | null
}

/** The ISO day an event is placed on, or null if it cannot be placed. */
export function placementDay(e: CalendarEventLike, tz = DEFAULT_TZ): string | null {
  if (!e.starts_at_local) return null
  if (e.date_kind === 'tba' || e.date_precision === 'unknown' || e.date_precision === 'month')
    return null
  const dt = DateTime.fromISO(e.starts_at_local, { zone: tz })
  return dt.isValid ? dt.toISODate() : null
}

/** Group events by placement day, each day sorted by start (timed after all-day). */
export function groupByDay<T extends CalendarEventLike>(
  events: T[],
  tz = DEFAULT_TZ,
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const e of events) {
    const day = placementDay(e, tz)
    if (!day) continue
    const list = map.get(day) ?? []
    list.push(e)
    map.set(day, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const ta = isTimed(a, tz) ? 1 : 0
      const tb = isTimed(b, tz) ? 1 : 0
      if (ta !== tb) return ta - tb
      return (a.starts_at_local ?? '').localeCompare(b.starts_at_local ?? '')
    })
  }
  return map
}

/**
 * Timed events get a clock time; everything else is "All day". A midnight
 * "instant" counts as all-day too: no source lists events at 00:00, but
 * Unstop and some AllEvents listings store a date-only value that way,
 * and "12:00 AM" would be a lie.
 */
export function isTimed(e: CalendarEventLike, tz = DEFAULT_TZ): boolean {
  if (e.date_precision !== 'instant' || !e.starts_at_local) return false
  const dt = DateTime.fromISO(e.starts_at_local, { zone: tz })
  return dt.isValid && (dt.hour !== 0 || dt.minute !== 0)
}

export function timeLabel(e: CalendarEventLike, tz = DEFAULT_TZ): string {
  if (!isTimed(e, tz)) return 'All day'
  return DateTime.fromISO(e.starts_at_local!, { zone: tz }).toFormat('h:mm a')
}

/** "→ 3 Sep" when the event runs past its start day, else null. */
export function spanLabel(e: CalendarEventLike, tz = DEFAULT_TZ): string | null {
  if (!e.starts_at_local || !e.ends_at_local) return null
  const s = DateTime.fromISO(e.starts_at_local, { zone: tz })
  const en = DateTime.fromISO(e.ends_at_local, { zone: tz })
  if (!s.isValid || !en.isValid || en.hasSame(s, 'day') || en < s) return null
  return `→ ${en.toFormat('d LLL')}`
}

/**
 * Colour carries the one thing the calendar is for: what you said yes to.
 * going = accent, saved = pastel of its category, everything else = outlined.
 */
export type BlockKind = 'going' | 'saved' | 'other'

export function blockKind(state: string | null | undefined): BlockKind {
  if (state === 'registered' || state === 'going' || state === 'attended') return 'going'
  if (state === 'interested') return 'saved'
  return 'other'
}
