import { describe, expect, it } from 'vitest'
import { fitFor, type Rankable } from './ranking'
import { isPremiumVenue } from './venues'

const base: Rankable = {
  title: 'Oracle AI Ecosystem Connect',
  description: null,
  tags: [],
  event_type: null,
  is_online: false,
  city: 'Chennai',
  venue: null,
  price_type: 'free',
  starts_at_local: '2026-09-03T10:00:00',
  relevance_score: 55,
}

describe('isPremiumVenue', () => {
  it('matches the venue strings sources actually send', () => {
    expect(isPremiumVenue('ITC Grand Chola, a Luxury Collection Hotel, Guindy')).toBe(true)
    expect(isPremiumVenue('Hyatt Regency, Anna Salai, Chennai')).toBe(true)
    expect(isPremiumVenue('Taj Coromandel')).toBe(true)
  })

  it('does not match ordinary venues or nulls', () => {
    expect(isPremiumVenue('IIT Madras Research Park')).toBe(false)
    expect(isPremiumVenue('Freshworks, OMR')).toBe(false)
    expect(isPremiumVenue(null)).toBe(false)
  })

  it('does not confer status on mid-tier hotel brands', () => {
    // The first live check matched a trivia night here. Never again.
    expect(isPremiumVenue('Rhapsody - Courtyard by Marriott: Chennai')).toBe(false)
  })
})

describe('prestige rank', () => {
  it('floors a free five-star event into Top picks', () => {
    const fit = fitFor({ ...base, venue: 'ITC Grand Chola, Guindy' }, null)
    expect(fit.rank).toBeGreaterThanOrEqual(82)
  })

  it('adds on top of an already-strong rank without capping at the floor', () => {
    const fit = fitFor({ ...base, venue: 'Taj Coromandel', relevance_score: 75 }, null)
    expect(fit.rank).toBe(95)
  })

  it('gives nothing to paid, online, or ordinary-venue events', () => {
    expect(fitFor({ ...base, venue: 'Taj Coromandel', price_type: 'paid' }, null).rank).toBe(55)
    expect(fitFor({ ...base, venue: 'Taj Coromandel', is_online: true }, null).rank).toBe(55)
    expect(fitFor({ ...base, venue: 'Freshworks, OMR' }, null).rank).toBe(55)
  })

  it('leaves unscored events unscored', () => {
    expect(
      fitFor({ ...base, venue: 'Taj Coromandel', relevance_score: null }, null).rank,
    ).toBeNull()
  })
})
