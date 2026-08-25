import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import {
  exclusiveEndToInclusive,
  inferYearForward,
  normalizeDateText,
  parseIsoLike,
  parseRangeBorrowingContext,
  parseWithFormats,
  precisionOfFormat,
  splitRange,
} from './parse'
import { DAY_FIRST_FORMATS, DEVPOST_FORMATS, KNOWAFEST_FORMATS } from './sources'
import { DEFAULT_TZ } from './types'

/** Fixed "now" so year inference is deterministic. 20 Dec 2026, IST. */
const DEC_2026 = DateTime.fromISO('2026-12-20T10:00:00', { zone: DEFAULT_TZ })
const JUL_2026 = DateTime.fromISO('2026-07-25T10:00:00', { zone: DEFAULT_TZ })

describe('text normalisation', () => {
  it('strips ordinal suffixes', () => {
    expect(normalizeDateText('12th August 2026')).toBe('12 August 2026')
    expect(normalizeDateText('1st - 3rd Sep')).toBe('1 - 3 Sep')
  })

  it('normalises en and em dashes to a plain separator', () => {
    expect(normalizeDateText('12 – 13 August 2026')).toBe('12 - 13 August 2026')
    expect(normalizeDateText('12 — 13 August 2026')).toBe('12 - 13 August 2026')
  })

  it('treats the word "to" as a range separator', () => {
    expect(splitRange('12 Aug to 14 Aug')).toEqual(['12 Aug', '14 Aug'])
  })
})

describe('precision is derived from the format string', () => {
  it.each([
    ['MMM d, yyyy h:mm a', 'instant'],
    ['d MMMM yyyy', 'day'],
    ['dd/MM/yyyy', 'day'],
    ['MMMM yyyy', 'month'],
  ])('%s -> %s', (fmt, expected) => {
    expect(precisionOfFormat(fmt)).toBe(expected)
  })
})

describe('the DD/MM trap', () => {
  // This is the whole reason `new Date(string)` is banned in this project.
  // Node reads "03/04/2026" as March 4. Every Indian date with a day <= 12
  // would silently become a plausible wrong value that nothing ever flags.
  it('reads 03/04/2026 as 3 April (day-first), not March 4', () => {
    const parsed = parseWithFormats('03/04/2026', DAY_FIRST_FORMATS, {
      reference: JUL_2026,
    })
    expect(parsed.local).toBe('2026-04-03T00:00:00')
    expect(parsed.precision).toBe('day')
  })

  it('disagrees with new Date() on exactly that input', () => {
    // Documents the bug we are avoiding rather than asserting our own output.
    const naive = new Date('03/04/2026')
    expect(naive.getMonth()).toBe(2) // month index 2 = March -- the US reading
    const parsed = parseWithFormats('03/04/2026', DAY_FIRST_FORMATS, {
      reference: JUL_2026,
    })
    expect(parsed.local?.slice(5, 7)).toBe('04') // April -- the day-first reading
    // Same string, a month apart. Nothing downstream could tell which it got.
  })
})

describe('forward-only year inference', () => {
  it('reads a bare "12 January" scraped in December as next January', () => {
    const parsed = parseWithFormats('12 January', KNOWAFEST_FORMATS, {
      reference: DEC_2026,
    })
    expect(parsed.local).toBe('2027-01-12T00:00:00')
  })

  it('keeps a just-passed date in the current year', () => {
    // 12 Dec is 8 days before the reference -- a listing that just happened,
    // not one 357 days away.
    const parsed = parseWithFormats('12 December', KNOWAFEST_FORMATS, {
      reference: DEC_2026,
    })
    expect(parsed.local).toBe('2026-12-12T00:00:00')
  })

  it('never moves a date backwards', () => {
    const dt = DateTime.fromISO('2027-03-01T00:00:00', { zone: DEFAULT_TZ })
    expect(inferYearForward(dt, DEC_2026).toISODate()).toBe('2027-03-01')
  })
})

describe('date-only sources keep day precision', () => {
  it('parses "12 Aug 2026" as a day, not midnight', () => {
    const parsed = parseWithFormats('12 Aug 2026', KNOWAFEST_FORMATS, {
      reference: JUL_2026,
    })
    expect(parsed.local).toBe('2026-08-12T00:00:00')
    // The UI keys off this to render "12 Aug" rather than "12 Aug, 12:00 AM",
    // which would otherwise sort ahead of every real event that day.
    expect(parsed.precision).toBe('day')
  })
})

describe('JSON-LD without an offset (AllEvents)', () => {
  it('reads a naive wall time as IST, not UTC', () => {
    const parsed = parseIsoLike('2026-08-01T18:00')
    expect(parsed.local).toBe('2026-08-01T18:00:00')
    expect(parsed.precision).toBe('instant')
    // 18:00 IST is 12:30 UTC. Reading it as 18:00 UTC would render 23:30 IST
    // and push every evening event onto the following day.
    expect(parsed.utc?.toISOString()).toBe('2026-08-01T12:30:00.000Z')
  })

  it('honours an explicit offset when one is present', () => {
    const parsed = parseIsoLike('2026-08-01T18:00:00+05:30')
    expect(parsed.utc?.toISOString()).toBe('2026-08-01T12:30:00.000Z')
  })

  it('converts a non-IST offset into local wall time', () => {
    // 13:00 UTC is 18:30 IST.
    const parsed = parseIsoLike('2026-08-01T13:00:00Z')
    expect(parsed.local).toBe('2026-08-01T18:30:00')
  })

  it('treats a bare date as day precision', () => {
    const parsed = parseIsoLike('2026-08-01')
    expect(parsed.precision).toBe('day')
  })
})

describe('Devpost submission periods', () => {
  // Devpost returns a display string and zero ISO timestamps. The year
  // appears only on the end of the range.
  it('borrows the year from the end of the range', () => {
    const range = parseRangeBorrowingContext('Jun 15 - Jul 31, 2026', DEVPOST_FORMATS, {
      reference: JUL_2026,
    })
    expect(range?.start.local).toBe('2026-06-15T00:00:00')
    expect(range?.end.local).toBe('2026-07-31T00:00:00')
    expect(range?.kind).toBe('window')
  })

  it('decrements the start year across a December-to-January window', () => {
    const range = parseRangeBorrowingContext('Dec 15 - Jan 31, 2027', DEVPOST_FORMATS, {
      reference: DEC_2026,
    })
    expect(range?.start.local).toBe('2026-12-15T00:00:00')
    expect(range?.end.local).toBe('2027-01-31T00:00:00')
  })

  it('handles a fully-qualified range', () => {
    const range = parseRangeBorrowingContext('Jun 15, 2026 - Jul 31, 2026', DEVPOST_FORMATS, {
      reference: JUL_2026,
    })
    expect(range?.start.local).toBe('2026-06-15T00:00:00')
    expect(range?.end.local).toBe('2026-07-31T00:00:00')
  })

  it('handles a same-month range where the month is only on the left', () => {
    // "Jul 03 - 31, 2026" -- found live. The left half carries the month and
    // the right carries the year, the mirror of the usual case. Two of
    // fourteen live listings used this shape.
    const range = parseRangeBorrowingContext('Jul 03 - 31, 2026', DEVPOST_FORMATS, {
      reference: JUL_2026,
    })
    expect(range?.start.local).toBe('2026-07-03T00:00:00')
    expect(range?.end.local).toBe('2026-07-31T00:00:00')
  })

  it('handles a same-month range spanning a later month', () => {
    const range = parseRangeBorrowingContext('Oct 08 - 09, 2026', DEVPOST_FORMATS, {
      reference: JUL_2026,
    })
    expect(range?.start.local).toBe('2026-10-08T00:00:00')
    expect(range?.end.local).toBe('2026-10-09T00:00:00')
  })

  it('handles a single date with no range', () => {
    const range = parseRangeBorrowingContext('Jul 31, 2026', DEVPOST_FORMATS, {
      reference: JUL_2026,
    })
    expect(range?.start.local).toBe('2026-07-31T00:00:00')
    expect(range?.kind).toBe('start')
  })
})

describe('day-first ranges', () => {
  it('borrows month and year for a bare leading day number', () => {
    const range = parseRangeBorrowingContext('12th – 13th August 2026', DAY_FIRST_FORMATS, {
      reference: JUL_2026,
    })
    expect(range?.start.local).toBe('2026-08-12T00:00:00')
    expect(range?.end.local).toBe('2026-08-13T00:00:00')
  })
})

describe('iCal DTEND is exclusive for all-day events', () => {
  // RFC 5545: a one-day all-day event has DTEND = the next day. Mapping it
  // straight through makes every all-day Luma event look two days long.
  it('subtracts a day from an all-day end', () => {
    const end = parseIsoLike('2026-08-13')
    const inclusive = exclusiveEndToInclusive(end, 'day')
    expect(inclusive.local).toBe('2026-08-12T00:00:00')
  })

  it('leaves timed events alone', () => {
    const end = parseIsoLike('2026-08-13T18:00')
    const inclusive = exclusiveEndToInclusive(end, 'instant')
    expect(inclusive.local).toBe('2026-08-13T18:00:00')
  })
})

describe('unparseable input fails loudly rather than guessing', () => {
  it.each(['', 'TBA', 'coming soon', 'Sometime next year'])(
    'returns unknown precision for %o',
    (input) => {
      const parsed = parseWithFormats(input, KNOWAFEST_FORMATS, {
        reference: JUL_2026,
      })
      expect(parsed.local).toBeNull()
      expect(parsed.precision).toBe('unknown')
    },
  )

  it('returns null rather than a fabricated date for a null input', () => {
    expect(parseWithFormats(null, KNOWAFEST_FORMATS).local).toBeNull()
    expect(parseIsoLike(undefined).local).toBeNull()
  })
})
