import { describe, expect, it } from 'vitest'
import { buildManualRow, type ManualEventInput } from './manual'

const base: ManualEventInput = {
  title: 'Kovaion Connect — Oracle AI Ecosystem',
  description: null,
  url: 'https://www.kovaion.com/connect?utm_source=li',
  date: '2026-09-12',
  time: '09:30',
  endDate: null,
  venue: 'ITC Grand Chola, Guindy',
  city: 'Chennai',
  isOnline: false,
  priceType: 'free',
  organizer: 'Kovaion',
  tags: ['ai', 'oracle'],
}

describe('buildManualRow', () => {
  it('builds a fully-shaped active row with the hand-picked score', () => {
    const row = buildManualRow(base)
    expect(row.source_id).toBe('manual')
    expect(row.status).toBe('active')
    expect(row.relevance_score).toBe(85)
    expect(row.relevance_reason).toBe('Hand-picked')
    expect(row.scoring_model).toBe('manual')
    expect(row.scored_content_hash).toBe(row.content_hash)
    expect(row.area).toBe('Guindy / Ekkatuthangal')
    expect(row.canonical_url).toBe('https://kovaion.com/connect')
  })

  it('converts IST wall time to the right UTC instant', () => {
    const row = buildManualRow(base)
    expect(row.starts_at_local).toBe('2026-09-12T09:30:00')
    expect(row.starts_at).toBe('2026-09-12T04:00:00.000Z')
    expect(row.date_precision).toBe('instant')
  })

  it('a date without a time is day-precision, not midnight', () => {
    const row = buildManualRow({ ...base, time: null })
    expect(row.date_precision).toBe('day')
    expect(row.starts_at_local).toBe('2026-09-12T00:00:00')
  })

  it('no date at all is honest TBA', () => {
    const row = buildManualRow({ ...base, date: null, time: null })
    expect(row.starts_at).toBeNull()
    expect(row.date_precision).toBe('unknown')
    expect(row.date_kind).toBe('tba')
  })

  it('rejects garbage dates loudly', () => {
    expect(() => buildManualRow({ ...base, date: '2026-13-45' })).toThrow(/invalid date/)
  })
})
