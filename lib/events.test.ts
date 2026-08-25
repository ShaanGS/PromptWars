import { describe, expect, it } from 'vitest'
import { effectiveInstant, effectiveLocal, isDeadlineEvent } from './events'

const devpost = {
  // The submission window opened in July; it closes on 25 Aug.
  date_kind: 'deadline',
  starts_at: '2026-07-23T00:00:00.000Z',
  starts_at_local: '2026-07-23T00:00:00',
  ends_at_local: '2026-08-25T00:00:00',
  registration_deadline: '2026-08-24T18:30:00.000Z',
}

const meetup = {
  date_kind: 'start',
  starts_at: '2026-08-25T12:00:00.000Z',
  starts_at_local: '2026-08-25T17:30:00',
  ends_at_local: '2026-08-25T19:30:00',
  registration_deadline: null,
}

describe('effective when', () => {
  it('uses the cutoff for a deadline listing, not the window opening', () => {
    expect(isDeadlineEvent(devpost)).toBe(true)
    expect(effectiveInstant(devpost)).toBe('2026-08-24T18:30:00.000Z')
    expect(effectiveLocal(devpost)).toBe('2026-08-25T00:00:00')
  })

  it('uses the start for a normal listing', () => {
    expect(isDeadlineEvent(meetup)).toBe(false)
    expect(effectiveInstant(meetup)).toBe(meetup.starts_at)
    expect(effectiveLocal(meetup)).toBe(meetup.starts_at_local)
  })

  it('falls back to the start when a deadline listing has no cutoff stored', () => {
    const partial = { ...devpost, registration_deadline: null }
    expect(isDeadlineEvent(partial)).toBe(false)
    expect(effectiveInstant(partial)).toBe(partial.starts_at)
    expect(effectiveLocal(partial)).toBe(partial.starts_at_local)
  })

  it('falls back to the local start when a deadline listing has no end', () => {
    expect(effectiveLocal({ ...devpost, ends_at_local: null })).toBe('2026-07-23T00:00:00')
  })
})
