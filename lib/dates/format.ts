import { DateTime } from 'luxon'
import { DEFAULT_TZ, type DatePrecision, type DateKind } from './types'

/**
 * Rendering rules.
 *
 * Always from `starts_at_local` + `precision`, never from the derived
 * timestamptz. A date-only listing must render "12 Aug" -- rendering it as
 * "12 Aug, 12:00 AM" is both wrong and actively misleading, because it looks
 * like a real midnight event.
 */

function toDateTime(local: string | null, tz = DEFAULT_TZ): DateTime | null {
  if (!local) return null
  const dt = DateTime.fromISO(local, { zone: tz })
  return dt.isValid ? dt : null
}

export function formatEventDate(
  local: string | null,
  precision: DatePrecision | null,
  tz = DEFAULT_TZ,
): string {
  const dt = toDateTime(local, tz)
  if (!dt) return 'Date TBA'

  const thisYear = DateTime.now().setZone(tz).year === dt.year

  // A midnight "instant" is a date-only listing in disguise (Unstop and
  // some AllEvents rows store the date that way); "12:00 AM" would be a
  // lie. Same rule as lib/calendar isTimed.
  const midnight = dt.hour === 0 && dt.minute === 0

  switch (precision) {
    case 'instant':
      if (midnight) return dt.toFormat(thisYear ? 'd LLL' : 'd LLL yyyy')
      return dt.toFormat(thisYear ? 'd LLL, h:mm a' : 'd LLL yyyy, h:mm a')
    case 'month':
      return dt.toFormat('LLLL yyyy')
    case 'day':
    default:
      return dt.toFormat(thisYear ? 'd LLL' : 'd LLL yyyy')
  }
}

export function formatRange(
  startLocal: string | null,
  endLocal: string | null,
  precision: DatePrecision | null,
  tz = DEFAULT_TZ,
): string {
  const start = toDateTime(startLocal, tz)
  const end = toDateTime(endLocal, tz)
  if (!start) return 'Date TBA'
  if (!end || end.hasSame(start, 'day')) return formatEventDate(startLocal, precision, tz)

  const sameMonth = start.hasSame(end, 'month') && start.hasSame(end, 'year')
  if (sameMonth) return `${start.toFormat('d')}–${end.toFormat('d LLL')}`
  return `${start.toFormat('d LLL')} – ${end.toFormat('d LLL')}`
}

/** "in 6 days" / "tomorrow" / "today". Null when there's nothing to count to. */
export function relativeDeadline(
  deadline: string | Date | null,
  tz = DEFAULT_TZ,
): { label: string; days: number } | null {
  if (!deadline) return null
  const dt =
    deadline instanceof Date
      ? DateTime.fromJSDate(deadline).setZone(tz)
      : DateTime.fromISO(deadline, { zone: tz })
  if (!dt.isValid) return null

  const now = DateTime.now().setZone(tz).startOf('day')
  const days = Math.round(dt.startOf('day').diff(now, 'days').days)

  if (days < 0) return { label: 'closed', days }
  if (days === 0) return { label: 'closes today', days }
  if (days === 1) return { label: 'closes tomorrow', days }
  return { label: `closes in ${days}d`, days }
}

/**
 * Google Calendar prefill link -- pure string construction, no OAuth.
 *
 * The dates use the calendar's floating local format (no Z) so the event
 * lands at the wall time the source stated, in whatever calendar timezone
 * the user keeps. All-day events use date-only bounds with an exclusive end,
 * which is what the Calendar URL API expects.
 */
export function googleCalendarUrl(input: {
  title: string
  local: string | null
  endLocal: string | null
  precision: DatePrecision | null
  venue?: string | null
  url?: string | null
  tz?: string
}): string | null {
  const start = toDateTime(input.local, input.tz ?? DEFAULT_TZ)
  if (!start) return null
  const end = toDateTime(input.endLocal, input.tz ?? DEFAULT_TZ)

  let dates: string
  if (input.precision === 'instant') {
    const endDt = end && end > start ? end : start.plus({ hours: 2 })
    dates = `${start.toFormat("yyyyMMdd'T'HHmmss")}/${endDt.toFormat("yyyyMMdd'T'HHmmss")}`
  } else {
    const endDt = (end && end > start ? end : start).plus({ days: 1 })
    dates = `${start.toFormat('yyyyMMdd')}/${endDt.toFormat('yyyyMMdd')}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    ctz: input.tz ?? DEFAULT_TZ,
  })
  if (input.venue) params.set('location', input.venue)
  if (input.url) params.set('details', input.url)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Devpost publishes a submission window rather than a start time, so its
 * listings must not be presented the way a meetup is.
 */
export function dateKindLabel(kind: DateKind | null): string | null {
  switch (kind) {
    case 'deadline':
      return 'Submissions'
    case 'window':
      return 'Runs'
    case 'tba':
      return 'Date TBA'
    default:
      return null
  }
}
