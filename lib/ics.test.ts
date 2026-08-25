import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { buildIcs, icsFilename } from './ics'

const now = DateTime.fromISO('2026-08-23T10:00:00Z', { zone: 'utc' })

describe('buildIcs', () => {
  it('writes a timed event with TZID and a 2h default end', () => {
    const ics = buildIcs(
      {
        id: 'abc',
        title: 'Design Meetup, Vol 12; live',
        starts_at_local: '2026-08-30T18:00:00',
        ends_at_local: null,
        date_precision: 'instant',
        venue: 'Anna Nagar',
        city: 'Chennai',
        url: 'https://lu.ma/x',
        description: 'Hello world.',
      },
      'Asia/Kolkata',
      now,
    )!
    expect(ics).toContain('DTSTART;TZID=Asia/Kolkata:20260830T180000')
    expect(ics).toContain('DTEND;TZID=Asia/Kolkata:20260830T200000')
    expect(ics).toContain(String.raw`SUMMARY:Design Meetup\, Vol 12\; live`)
    expect(ics).toContain(String.raw`LOCATION:Anna Nagar\, Chennai`)
    expect(ics).toContain('DESCRIPTION:Hello world.\\n\\nhttps://lu.ma/x')
    expect(ics).toContain('UID:abc@olvable')
    expect(ics).toContain('DTSTAMP:20260823T100000Z')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('writes an all-day event with exclusive DTEND', () => {
    const ics = buildIcs(
      {
        id: 'x',
        title: 'Fest',
        starts_at_local: '2026-09-04T00:00:00',
        ends_at_local: '2026-09-06T00:00:00',
        date_precision: 'day',
        url: 'https://u/1',
      },
      'Asia/Kolkata',
      now,
    )!
    expect(ics).toContain('DTSTART;VALUE=DATE:20260904')
    expect(ics).toContain('DTEND;VALUE=DATE:20260907')
  })

  it('returns null without a start', () => {
    expect(
      buildIcs({
        id: 'x',
        title: 'T',
        starts_at_local: null,
        ends_at_local: null,
        date_precision: 'unknown',
        url: 'u',
      }),
    ).toBeNull()
  })

  it('folds long lines and keeps the excerpt short', () => {
    const long = 'word '.repeat(200)
    const ics = buildIcs(
      {
        id: 'x',
        title: 'T',
        starts_at_local: '2026-09-04T10:00:00',
        ends_at_local: null,
        date_precision: 'instant',
        url: 'https://u/1',
        description: long,
      },
      'Asia/Kolkata',
      now,
    )!
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
    const desc = ics
      .split('\r\n')
      .filter((l) => l.startsWith('DESCRIPTION:') || l.startsWith(' '))
      .join('')
    expect(desc.length).toBeLessThan(400)
  })
})

describe('icsFilename', () => {
  it('slugs', () => {
    expect(icsFilename('Chennai Design Meetup — Vol. 12!')).toBe('Chennai-Design-Meetup-Vol-12.ics')
    expect(icsFilename('***')).toBe('event.ics')
  })
})

describe('location', () => {
  it('dedupes venue and city', () => {
    const ics = buildIcs(
      {
        id: 'x',
        title: 'T',
        starts_at_local: '2026-09-04T10:00:00',
        ends_at_local: null,
        date_precision: 'instant',
        venue: 'Chennai',
        city: 'chennai',
        url: 'https://u/1',
      },
      'Asia/Kolkata',
      now,
    )!
    expect(ics).toContain('LOCATION:Chennai\r\n')
  })
})
