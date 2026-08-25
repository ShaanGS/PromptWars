import { describe, expect, it } from 'vitest'
import { eventbriteConnector } from './eventbrite'

/** Verbatim from the live Chennai browse page's JSON-LD, 2026-08-24. */
const SAMPLE = {
  '@type': 'Event',
  name: 'Women in Tech Chennai - OutGeekWomen',
  description: 'All the badass women in tech, are you in? #outgeekwomen #womenintech',
  startDate: '2026-11-19',
  endDate: '2026-11-19',
  url: 'https://www.eventbrite.com/e/women-in-tech-chennai-outgeekwomen-tickets-1330299414359',
  image: 'https://img.evbuc.com/whatever.jpg',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: 'Chennai',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Chennai',
      addressRegion: 'TN',
      addressCountry: 'IN',
      streetAddress: 'TBA',
    },
  },
}

describe('eventbrite toEvent', () => {
  const event = eventbriteConnector.toEvent!({ sourceUid: '1330299414359', payload: SAMPLE })!

  it('maps the JSON-LD to an offline day-precision event', () => {
    expect(event.title).toBe('Women in Tech Chennai - OutGeekWomen')
    expect(event.isOnline).toBe(false)
    expect(event.city).toBe('Chennai')
    expect(event.startsAtLocal).toBe('2026-11-19T00:00:00')
    expect(event.datePrecision).toBe('day')
    expect(event.priceType).toBe('unknown')
  })

  it('does not store the city as a venue when the real venue is TBA', () => {
    expect(event.venue).toBeNull()
  })

  it('keeps a real venue when one is named', () => {
    const withVenue = eventbriteConnector.toEvent!({
      sourceUid: 'x',
      payload: { ...SAMPLE, location: { ...SAMPLE.location, name: 'IIT Madras Research Park' } },
    })!
    expect(withVenue.venue).toBe('IIT Madras Research Park')
  })

  it('marks online events online, with no city', () => {
    const online = eventbriteConnector.toEvent!({
      sourceUid: 'x',
      payload: { ...SAMPLE, eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode' },
    })!
    expect(online.isOnline).toBe(true)
    expect(online.city).toBeNull()
  })
})
