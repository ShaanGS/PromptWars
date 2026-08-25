import { DateTime } from 'luxon'
import { DEFAULT_TZ } from './dates/types'
import { snippet } from './text'

/**
 * One event as an iCalendar file (RFC 5545), for "Download .ics".
 *
 * Times are written with TZID=Asia/Kolkata rather than converted to UTC,
 * so the event lands at the wall time the organiser stated in any
 * calendar app. Date-only listings become all-day VEVENTs with an
 * exclusive DTEND. The DESCRIPTION is the same excerpt the detail page
 * shows plus the listing URL -- never the full prose.
 */
export interface IcsEvent {
  id: string
  title: string
  starts_at_local: string | null
  ends_at_local: string | null
  date_precision: string | null
  venue?: string | null
  city?: string | null
  url: string
  description?: string | null
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Fold lines at 75 octets per the spec; calendar apps are strict about it. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const out: string[] = []
  let i = 0
  let first = true
  while (i < bytes.length) {
    const take = first ? 75 : 74
    let end = Math.min(i + take, bytes.length)
    // Do not split a multi-byte character.
    while (end < bytes.length && end > i && (bytes[end] & 0xc0) === 0x80) end--
    out.push((first ? '' : ' ') + bytes.subarray(i, end).toString('utf8'))
    i = end
    first = false
  }
  return out.join('\r\n')
}

export function buildIcs(
  e: IcsEvent,
  tz = DEFAULT_TZ,
  now: DateTime = DateTime.utc(),
): string | null {
  const start = e.starts_at_local ? DateTime.fromISO(e.starts_at_local, { zone: tz }) : null
  if (!start || !start.isValid) return null
  const end = e.ends_at_local ? DateTime.fromISO(e.ends_at_local, { zone: tz }) : null

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Olvable//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@olvable`,
    `DTSTAMP:${now.toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
  ]

  // A midnight "instant" is a date-only listing in disguise (see
  // lib/calendar isTimed); export it as all-day rather than 00:00-02:00.
  const timed = e.date_precision === 'instant' && (start.hour !== 0 || start.minute !== 0)
  if (timed) {
    const endDt = end && end.isValid && end > start ? end : start.plus({ hours: 2 })
    lines.push(`DTSTART;TZID=${tz}:${start.toFormat("yyyyMMdd'T'HHmmss")}`)
    lines.push(`DTEND;TZID=${tz}:${endDt.toFormat("yyyyMMdd'T'HHmmss")}`)
  } else {
    const last = end && end.isValid && end > start ? end : start
    lines.push(`DTSTART;VALUE=DATE:${start.toFormat('yyyyMMdd')}`)
    lines.push(`DTEND;VALUE=DATE:${last.plus({ days: 1 }).toFormat('yyyyMMdd')}`)
  }

  lines.push(`SUMMARY:${esc(e.title)}`)
  const location = [e.venue, e.city]
    .filter((v): v is string => Boolean(v))
    .filter((v, i, all) => all.findIndex((o) => o.toLowerCase() === v.toLowerCase()) === i)
    .join(', ')
  if (location) lines.push(`LOCATION:${esc(location)}`)
  lines.push(`URL:${e.url}`)
  const excerpt = snippet(e.description)
  lines.push(`DESCRIPTION:${esc(excerpt ? `${excerpt}\n\n${e.url}` : e.url)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.map(fold).join('\r\n') + '\r\n'
}

/** A safe filename for the download. */
export function icsFilename(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
  return `${slug || 'event'}.ics`
}
