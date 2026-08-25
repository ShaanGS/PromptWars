import { describe, expect, it } from 'vitest'
import { formatEventDate } from './format'

describe('formatEventDate', () => {
  it('renders a real time for timed events', () => {
    expect(formatEventDate('2026-08-30T18:00:00', 'instant')).toMatch(/30 Aug, 6:00 PM$/)
  })
  it('drops the time for a midnight instant', () => {
    expect(formatEventDate('2026-08-25T00:00:00', 'instant')).toMatch(/25 Aug$/)
    expect(formatEventDate('2026-08-25T00:30:00', 'instant')).toMatch(/12:30 AM$/)
  })
  it('never shows a time for day precision', () => {
    expect(formatEventDate('2026-08-25T10:00:00', 'day')).toMatch(/25 Aug$/)
  })
})
