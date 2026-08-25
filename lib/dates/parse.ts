import { DateTime } from 'luxon'
import {
  DEFAULT_TZ,
  UNPARSEABLE,
  type DatePrecision,
  type ParsedDate,
  type ParsedDateRange,
} from './types'

/**
 * HARD RULE: `new Date(string)` never touches source data anywhere in this
 * project. Node parses "03/04/2026" as March 4 (US locale), so every Indian
 * DD/MM date with a day <= 12 would silently become a plausible wrong date
 * that nothing would ever flag. Every parse below states its format
 * explicitly and its zone explicitly.
 */

/** Strip 1st/2nd/3rd/12th so "12th August" parses with a plain `d` token. */
export function stripOrdinals(text: string): string {
  return text.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1')
}

/** Normalise en/em dashes and the word "to" into a single ASCII separator. */
export function normalizeDashes(text: string): string {
  return text.replace(/[‐-―−]/g, '-').replace(/\s+to\s+/gi, ' - ')
}

export function normalizeDateText(text: string): string {
  return normalizeDashes(stripOrdinals(text)).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Derive precision from the luxon format string itself, so a format table
 * can't drift out of sync with the precision it implies.
 *
 * Token notes: `M`/`L` are month, lowercase `m` is minute, `d` is day,
 * `H`/`h` are hour. "MMM" therefore contains no lowercase `m`.
 */
export function precisionOfFormat(fmt: string): DatePrecision {
  if (/[Hh]/.test(fmt)) return 'instant'
  if (/d/.test(fmt)) return 'day'
  if (/[ML]/.test(fmt)) return 'month'
  return 'unknown'
}

export function formatHasYear(fmt: string): boolean {
  return /y/.test(fmt)
}

/**
 * Year inference is forward-only. A source that prints "12 January" with no
 * year, scraped in December, means *next* January -- listings advertise
 * upcoming events, not ones eleven months gone.
 *
 * The 60-day grace window keeps a genuinely just-past event in the current
 * year instead of flinging it a year forward.
 */
export function inferYearForward(dt: DateTime, reference: DateTime): DateTime {
  const cutoff = reference.minus({ days: 60 })
  let out = dt
  while (out < cutoff) out = out.plus({ years: 1 })
  return out
}

function toParsed(dt: DateTime, precision: DatePrecision, tz: string): ParsedDate {
  if (!dt.isValid) return { ...UNPARSEABLE, tz }
  return {
    local: dt.toFormat("yyyy-MM-dd'T'HH:mm:ss"),
    tz,
    utc: dt.toUTC().toJSDate(),
    precision,
  }
}

export interface ParseOptions {
  tz?: string
  /** "Now" for year inference. Injected so tests are deterministic. */
  reference?: DateTime
}

/**
 * Try each format in order and return the first that parses. Formats are
 * per-source and explicit -- there is deliberately no "smart" fallback.
 */
export function parseWithFormats(
  raw: string | null | undefined,
  formats: string[],
  opts: ParseOptions = {},
): ParsedDate {
  const tz = opts.tz ?? DEFAULT_TZ
  if (!raw) return { ...UNPARSEABLE, tz }

  const text = normalizeDateText(raw)
  if (!text) return { ...UNPARSEABLE, tz }

  const reference = opts.reference ?? DateTime.now().setZone(tz)

  for (const fmt of formats) {
    const dt = DateTime.fromFormat(text, fmt, { zone: tz })
    if (!dt.isValid) continue
    const resolved = formatHasYear(fmt) ? dt : inferYearForward(dt, reference)
    return toParsed(resolved, precisionOfFormat(fmt), tz)
  }
  return { ...UNPARSEABLE, tz }
}

/**
 * ISO-ish strings, as found in JSON-LD.
 *
 * AllEvents frequently omits the offset: "2026-08-01T18:00". Parsed on a UTC
 * runtime that becomes 23:30 IST, shunting every evening event onto the next
 * day. So a missing offset is read as local wall time in `tz`; a present
 * offset is converted into `tz` and its wall time kept.
 */
export function parseIsoLike(raw: string | null | undefined, opts: ParseOptions = {}): ParsedDate {
  const tz = opts.tz ?? DEFAULT_TZ
  if (!raw) return { ...UNPARSEABLE, tz }
  const text = raw.trim()
  if (!text) return { ...UNPARSEABLE, tz }

  const hasTime = text.includes('T') || /\d{2}:\d{2}/.test(text)

  const dt = DateTime.fromISO(text, {
    zone: tz,
    setZone: false,
  })
  if (!dt.isValid) return { ...UNPARSEABLE, tz }

  // fromISO with an offset returns the correct instant; setZone:false already
  // rendered it into `tz`, so the wall time is right either way.
  return toParsed(dt, hasTime ? 'instant' : 'day', tz)
}

/** Split "A - B" into both halves, or return null when there's no range. */
export function splitRange(text: string): [string, string] | null {
  const normalized = normalizeDateText(text)
  const idx = normalized.indexOf(' - ')
  if (idx === -1) return null
  return [normalized.slice(0, idx).trim(), normalized.slice(idx + 3).trim()]
}

/**
 * Ranges where only the right-hand side carries the full context.
 *
 * Devpost: "Jun 15 - Jul 31, 2026" -- year only on the end.
 * Day-first sites: "12 - 13 August 2026" -- month and year only on the end.
 *
 * The left side is re-parsed with the missing units borrowed from the right,
 * then decremented a year if that would put the start after the end (a
 * December-to-January window).
 */
export function parseRangeBorrowingContext(
  raw: string | null | undefined,
  formats: string[],
  opts: ParseOptions = {},
): ParsedDateRange | null {
  const tz = opts.tz ?? DEFAULT_TZ
  if (!raw) return null

  const halves = splitRange(raw)
  if (!halves) {
    const single = parseWithFormats(raw, formats, opts)
    if (!single.local) return null
    return { start: single, end: single, kind: 'start' }
  }

  const [leftText, rightText] = halves
  let end = parseWithFormats(rightText, formats, opts)

  if (!end.local) {
    // Same-month range: "Jul 03 - 31, 2026". Here it is the LEFT half that
    // carries the month and the right that carries the year -- the mirror of
    // the usual case -- so the month has to be borrowed leftwards.
    const leftMonth = /^([A-Za-z]{3,9})/.exec(leftText)?.[1]
    if (leftMonth) {
      const attempt = parseWithFormats(`${leftMonth} ${rightText}`, formats, opts)
      if (attempt.local) end = attempt
    }
  }

  if (!end.local || !end.utc) return null

  const endDt = DateTime.fromFormat(end.local, "yyyy-MM-dd'T'HH:mm:ss", { zone: tz })

  // First try the left half standalone (it may be fully qualified).
  let start = parseWithFormats(leftText, formats, opts)

  if (!start.local) {
    // Borrow month and year from the end, in decreasing order of specificity.
    const borrowed = [
      `${leftText} ${endDt.toFormat('yyyy')}`,
      `${leftText} ${endDt.toFormat('MMMM yyyy')}`,
      `${leftText} ${endDt.toFormat('MMM yyyy')}`,
    ]
    for (const candidate of borrowed) {
      const attempt = parseWithFormats(candidate, formats, opts)
      if (attempt.local) {
        start = attempt
        break
      }
    }
  }

  if (!start.local) {
    // A bare day number: "12 - 13 August 2026".
    const dayOnly = /^\d{1,2}$/.exec(leftText)
    if (dayOnly) {
      const day = Number(dayOnly[0])
      const candidate = endDt.set({ day })
      if (candidate.isValid) {
        start = toParsed(candidate, end.precision, tz)
      }
    }
  }

  if (!start.local) return { start: end, end, kind: 'start' }

  // A start after its end means the window crossed a new year.
  let startDt = DateTime.fromFormat(start.local, "yyyy-MM-dd'T'HH:mm:ss", { zone: tz })
  if (startDt > endDt) {
    startDt = startDt.minus({ years: 1 })
    start = toParsed(startDt, start.precision, tz)
  }

  return { start, end, kind: 'window' }
}

/**
 * iCal all-day events: RFC 5545 makes DTEND *exclusive*. A single-day event
 * has DTEND = the next day, so mapping it straight through renders every
 * all-day event as two days long.
 */
export function exclusiveEndToInclusive(end: ParsedDate, precision: DatePrecision): ParsedDate {
  if (precision !== 'day' || !end.local) return end
  const dt = DateTime.fromFormat(end.local, "yyyy-MM-dd'T'HH:mm:ss", { zone: end.tz })
  if (!dt.isValid) return end
  return toParsed(dt.minus({ days: 1 }), precision, end.tz)
}
