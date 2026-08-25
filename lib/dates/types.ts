/**
 * Date semantics for the aggregator.
 *
 * The core problem: none of our sources give us instants. They give us wall
 * times of varying precision, usually with no zone, sometimes with no year,
 * and in at least one case in a format that is ambiguous with US convention.
 *
 * A bare `timestamptz` throws away everything we need to render correctly:
 * a date-only college fest becomes "12 Aug, 12:00 AM" and sorts ahead of
 * every real event that day. So we keep the naive wall time AND the zone AND
 * how precise the source actually was, and derive the instant separately for
 * sorting and filtering only.
 */

/** How precise the source actually was. Drives rendering. */
export type DatePrecision =
  /** Source gave a real time of day. Render "12 Aug, 6:00 PM". */
  | 'instant'
  /** Source gave a date only. Render "12 Aug" -- never a time. */
  | 'day'
  /** Source gave a month only. Render "August 2026". */
  | 'month'
  /** Nothing parseable. */
  | 'unknown'

/**
 * What the date on an event actually means.
 *
 * Devpost is the reason this exists: it publishes a submission period, not a
 * start time. Rendering its period-end as a start date shows "15 Sep" for a
 * hackathon you could join today, which would deprioritise exactly the thing
 * the user needs to see.
 */
export type DateKind =
  /** A start time. The normal case. */
  | 'start'
  /** A closing date -- registration or submission. Render as "closes in Nd". */
  | 'deadline'
  /** A multi-day window with both ends known. */
  | 'window'
  /** Announced, date not yet published. */
  | 'tba'

/**
 * A parsed date, kept in the form the source stated it.
 *
 * `local` is a naive ISO string with NO offset: 'YYYY-MM-DDTHH:mm:ss'. It is
 * the wall time as written. `tz` says how to interpret it. `utc` is derived
 * and exists only so Postgres can sort and range-filter.
 *
 * Render from `local` + `precision`. Never render `utc`.
 */
export interface ParsedDate {
  local: string | null
  tz: string
  utc: Date | null
  precision: DatePrecision
}

/** A start/end pair, e.g. a submission window or a two-day conference. */
export interface ParsedDateRange {
  start: ParsedDate
  end: ParsedDate
  kind: DateKind
}

/** Everything in this project is Chennai unless a source says otherwise. */
export const DEFAULT_TZ = 'Asia/Kolkata'

export const UNPARSEABLE: ParsedDate = {
  local: null,
  tz: DEFAULT_TZ,
  utc: null,
  precision: 'unknown',
}
