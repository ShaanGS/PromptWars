import { describe, expect, it } from 'vitest'
import { extractNextData, makeBevyConnector } from './bevy'

const connector = makeBevyConnector('gdg', 'https://gdg.community.dev/gdg-chennai/', 'GDG Chennai')

/** Trimmed from the live GDG Chennai event detail page, 2026-08-24. */
const SAMPLE = {
  id: 127271,
  title: 'Google I/O Extended Chennai 2026',
  description_short: 'The community-led extension of Google I/O in Chennai.',
  url: 'https://gdg.community.dev/events/details/google-gdg-chennai-presents-google-io-extended-chennai-2026/',
  start_date_iso: '2026-08-01T09:00:00+05:30',
  end_date_iso: '2026-08-01T17:00:00+05:30',
  is_virtual_event: true,
  venue_name: 'Ford Global Technology & Business Center',
  venue_address: 'Sholinganallur',
  venue_city: 'Chennai',
  cropped_banner_url: 'https://res.cloudinary.com/x/banner.png',
  chapter_title: 'GDG Chennai',
}

describe('bevy toEvent', () => {
  const event = connector.toEvent!({ sourceUid: '127271', payload: SAMPLE })!

  it('a named venue outranks is_virtual_event', () => {
    // The live flagship carried is_virtual_event=true while naming the
    // Ford GTBC. Venue wins; the event is offline.
    expect(event.isOnline).toBe(false)
    expect(event.venue).toBe('Ford Global Technology & Business Center, Sholinganallur')
    expect(event.city).toBe('Chennai')
  })

  it('reads the offset-carrying ISO dates at instant precision', () => {
    expect(event.startsAtLocal).toBe('2026-08-01T09:00:00')
    expect(event.endsAtLocal).toBe('2026-08-01T17:00:00')
    expect(event.datePrecision).toBe('instant')
    expect(event.organizer).toBe('GDG Chennai')
  })

  it('a city-only chapter title falls back to the community name', () => {
    // Friends of Figma's chapter_title is literally "Chennai"; "by
    // Chennai" is not an organizer (seen live 2026-08-24).
    const fof = makeBevyConnector(
      'figma',
      'https://friends.figma.com/chennai/',
      'Friends of Figma Chennai',
    )
    const event = fof.toEvent!({
      sourceUid: 'x',
      payload: { ...SAMPLE, chapter_title: 'Chennai' },
    })!
    expect(event.organizer).toBe('Friends of Figma Chennai')
  })

  it('no venue + virtual flag means online', () => {
    const online = connector.toEvent!({
      sourceUid: 'x',
      payload: { ...SAMPLE, venue_name: null, venue_address: null },
    })!
    expect(online.isOnline).toBe(true)
    expect(online.city).toBeNull()
  })
})

describe('extractNextData', () => {
  it('parses the embedded blob and survives garbage', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}}}</script>`
    expect(extractNextData(html)).toEqual({ props: { pageProps: {} } })
    expect(extractNextData('<html>no blob</html>')).toBeNull()
    expect(
      extractNextData('<script id="__NEXT_DATA__" type="application/json">{broken</script>'),
    ).toBeNull()
  })
})
