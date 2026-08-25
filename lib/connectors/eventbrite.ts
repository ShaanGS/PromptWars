import { parseIsoLike } from '@/lib/dates/parse'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities, stripHtml } from '@/lib/text'
import { extractEvents, type JsonLdEvent } from './allevents'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Eventbrite -- the Chennai browse pages.
 *
 * robots.txt (surveyed 2026-08-24) allows /d/ and /e/ for `*`; what it
 * disallows is the internal destination-search JSON API, so this connector
 * reads the browse pages' schema.org JSON-LD (~24 events/page) and never
 * touches that API. Same parse-structured-data-never-DOM stance as
 * AllEvents, whose extractor it shares.
 *
 * Ships disabled: Shaan wants it enableable from Sources, not on. When
 * flipping `enabled`, also add `eventbrite` to the ingest.yml loop.
 */

const PAGES = [
  'https://www.eventbrite.com/d/india--chennai/all-events/',
  'https://www.eventbrite.com/d/india--chennai/all-events/?page=2',
  'https://www.eventbrite.com/d/india--chennai/all-events/?page=3',
]

/** Eventbrite URLs end in "-tickets-<long numeric id>". */
function uidFromUrl(url: string): string | null {
  const match = /-tickets-(\d{6,})(?:\?|#|$)/.exec(url)
  if (match) return match[1]
  const fallback = /\/(\d{9,})(?:\?|#|$)/.exec(url)
  return fallback ? fallback[1] : null
}

function placeOf(location: JsonLdEvent['location']): { venue: string | null; city: string | null } {
  if (!location) return { venue: null, city: null }
  if (typeof location === 'string') return { venue: location, city: null }
  const address = location.address
  const city = typeof address === 'object' && address ? (address.addressLocality ?? null) : null
  // Eventbrite often puts the city where the venue belongs ("Chennai") when
  // the real venue is TBA; that is not a venue worth storing.
  const venue = location.name && location.name !== city ? location.name : null
  return { venue, city }
}

export const eventbriteConnector: Connector = {
  id: 'eventbrite',
  needsLLM: false,
  volatileFields: [],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const listings: RawListing[] = []
    const seen = new Set<string>()

    for (const url of PAGES) {
      if (listings.length >= ctx.maxListings) break
      try {
        const res = await ctx.get(url)
        const html = await res.text()
        const events = extractEvents(html)
        ctx.log(`${url.split('?')[1] ?? 'page=1'}: ${events.length} events`)

        for (const event of events) {
          if (!event.url) continue
          const uid = uidFromUrl(event.url)
          if (!uid || seen.has(uid)) continue
          seen.add(uid)
          listings.push({ sourceUid: uid, payload: event })
        }
      } catch (err) {
        // One dead page must not sink the whole run.
        ctx.log(`${url}: FAILED -- ${err instanceof Error ? err.message : err}`)
      }
    }

    return { listings, cursor: {}, done: true }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const e = raw.payload as JsonLdEvent
    if (!e?.name || !e?.url) return null

    const isOnline = (e.eventAttendanceMode ?? '').includes('Online')
    const { venue, city } = placeOf(e.location)

    // Dates arrive as "2026-11-19" (day) or with an offset (instant); a
    // missing offset reads as IST, same rule as AllEvents.
    const start = parseIsoLike(e.startDate, { tz: DEFAULT_TZ })
    const end = parseIsoLike(e.endDate, { tz: DEFAULT_TZ })

    const offers = Array.isArray(e.offers) ? e.offers : e.offers ? [e.offers] : []
    const prices = offers.map((o) => Number(o?.price)).filter((n) => Number.isFinite(n))
    const cheapest = prices.length ? Math.min(...prices) : null

    const organizer = typeof e.organizer === 'string' ? e.organizer : (e.organizer?.name ?? null)

    return {
      title: decodeEntities(e.name),
      description: stripHtml(e.description)?.slice(0, 400) ?? null,
      url: e.url,
      canonicalUrl: e.url,
      imageUrl: e.image ?? null,
      organizer,

      startsAtLocal: start.local,
      endsAtLocal: end.local ?? start.local,
      startsAt: start.utc,
      endsAt: end.utc ?? start.utc,
      registrationDeadline: null,
      tz: DEFAULT_TZ,
      datePrecision: start.precision,
      dateKind: start.local ? 'start' : 'tba',

      isOnline,
      city: isOnline ? null : city,
      venue,
      eventType: null,
      tags: [],
      priceType: cheapest === null ? 'unknown' : cheapest === 0 ? 'free' : 'paid',
      priceAmount: cheapest && cheapest > 0 ? cheapest : null,
      priceCurrency: offers.find((o) => o?.priceCurrency)?.priceCurrency ?? null,
    }
  },
}
