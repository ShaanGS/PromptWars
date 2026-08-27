import { describe, expect, it } from 'vitest'
import type { AvailabilityWindow } from '@/lib/engine'
import { summariseAvailability, weeklyMinutes } from './availability-summary'

const w = (day: number, start: string, end: string) =>
  ({ day, start, end }) as unknown as AvailabilityWindow

describe('weeklyMinutes', () => {
  it('adds the windows up', () => {
    expect(weeklyMinutes([w(2, '18:00', '21:00'), w(4, '18:00', '21:00')])).toBe(360)
  })

  // Junk reaches here from a jsonb column, and a negative would render as
  // somebody being less available than a person with no windows at all.
  it('ignores inverted and malformed windows rather than going negative', () => {
    expect(weeklyMinutes([w(1, '21:00', '18:00')])).toBe(0)
    expect(weeklyMinutes([w(1, 'evening', '21:00')])).toBe(0)
    expect(weeklyMinutes([w(1, '25:00', '26:00')])).toBe(0)
    expect(weeklyMinutes([])).toBe(0)
  })
})

describe('summariseAvailability', () => {
  it('names the days and calls late windows evenings', () => {
    expect(summariseAvailability([w(2, '18:00', '21:00'), w(4, '18:00', '21:00')])).toBe(
      'Tue & Thu evenings · ~6 h/week',
    )
  })

  it('collapses Saturday and Sunday to weekends', () => {
    // 09:00-13:00 runs past noon, so it is not a morning window and the
    // plural stands on its own.
    expect(summariseAvailability([w(6, '09:00', '13:00'), w(0, '09:00', '13:00')])).toBe(
      'Weekends · ~8 h/week',
    )
  })

  it('drops the plural when a time of day follows it', () => {
    expect(summariseAvailability([w(6, '09:00', '11:00'), w(0, '09:00', '11:00')])).toBe(
      'Weekend mornings · ~4 h/week',
    )
  })

  it('says most days once the week is mostly covered', () => {
    const windows = [1, 2, 3, 4, 5].map((d) => w(d, '21:30', '23:30'))
    expect(summariseAvailability(windows)).toBe('Most days evenings · ~10 h/week')
  })

  it('returns null when there is nothing usable to say', () => {
    expect(summariseAvailability([])).toBeNull()
    expect(summariseAvailability([w(1, '21:00', '18:00')])).toBeNull()
  })
})
