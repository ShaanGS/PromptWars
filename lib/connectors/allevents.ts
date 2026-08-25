import { parseIsoLike } from '@/lib/dates/parse'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities, stripHtml } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * AllEvents.in -- the Chennai city pages.
 *
 * This is the source the Notion list was actually pointing at: local, dated,
 * offline Chennai events rather than national hackathons.
 *
 * Pages embed schema.org Event objects as JSON-LD, ~45 per page. We parse the
 * JSON-LD and never the DOM: a redesign changes markup constantly and changes
 * structured data almost never.
 *
 * robots.txt sets `ClaudeBot: Crawl-delay 10`. We are not ClaudeBot, so the
 * `*` group technically applies -- but honouring the strictest published delay
 * is the right call, and it is why this connector is cursor-based: at 10s a
 * request it cannot sweep every category in one run.
 */

interface JsonLdAddress {
  addressLocality?: string
  addressRegion?: string
  streetAddress?: string
}

interface JsonLdPlace {
  name?: string
  address?: JsonLdAddress | string
}

interface JsonLdOffer {
  price?: string | number
  priceCurrency?: string
}

export interface JsonLdEvent {
  '@type'?: string
  name?: string
  description?: string
  image?: string
  startDate?: string
  endDate?: string
  url?: string
  location?: JsonLdPlace | string
  eventAttendanceMode?: string
  offers?: JsonLdOffer[] | JsonLdOffer
  organizer?: { name?: string } | string
}

/**
 * Category pages, most-relevant first so a truncated run still collects the
 * useful ones. `all` leads because it is the broadest single sweep.
 */
const CATEGORIES = [
  'all',
  'business',
  'workshops',
  'startups',
  'technology',
  'networking',
  'conferences',
]

/** Exported for reuse: Eventbrite embeds the same schema.org JSON-LD. */
export function extractEvents(html: string): JsonLdEvent[] {
  const blocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1])

  const events: JsonLdEvent[] = []
  for (const block of blocks) {
    let parsed: unknown
    try {
      parsed = JSON.parse(block.trim())
    } catch {
      continue // A malformed block is not worth failing the whole page over.
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed]
    for (const node of nodes) {
      const n = node as JsonLdEvent & { itemListElement?: Array<{ item?: JsonLdEvent }> }
      if (n?.['@type'] === 'Event') events.push(n)
      if (Array.isArray(n?.itemListElement)) {
        for (const entry of n.itemListElement) {
          const item = (entry?.item ?? entry) as JsonLdEvent
          if (item?.['@type'] === 'Event') events.push(item)
        }
      }
    }
  }
  return events
}

/** AllEvents URLs end in a long numeric id: /chennai/<slug>/<id>. */
function uidFromUrl(url: string): string | null {
  const match = /\/(\d{6,})(?:\?|#|$)/.exec(url)
  if (match) return match[1]
  try {
    return new URL(url).pathname.replace(/^\/+|\/+$/g, '') || null
  } catch {
    return null
  }
}

function placeOf(location: JsonLdEvent['location']): {
  venue: string | null
  city: string | null
} {
  if (!location) return { venue: null, city: null }
  if (typeof location === 'string') return { venue: location, city: null }
  const address = location.address
  const city = typeof address === 'object' && address ? (address.addressLocality ?? null) : null
  return { venue: location.name ?? null, city }
}

export const allEventsConnector: Connector = {
  id: 'allevents',
  needsLLM: false,
  volatileFields: [],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const startIndex = typeof ctx.cursor.categoryIndex === 'number' ? ctx.cursor.categoryIndex : 0
    const listings: RawListing[] = []
    const seen = new Set<string>()
    let index = startIndex

    while (index < CATEGORIES.length && listings.length < ctx.maxListings) {
      const category = CATEGORIES[index]
      const url = `https://allevents.in/chennai/${category}`

      try {
        const res = await ctx.get(url)
        const html = await res.text()
        const events = extractEvents(html)
        ctx.log(`${category}: ${events.length} events`)

        for (const event of events) {
          if (!event.url) continue
          const uid = uidFromUrl(event.url)
          if (!uid || seen.has(uid)) continue
          seen.add(uid)
          listings.push({ sourceUid: uid, payload: event })
        }
      } catch (err) {
        // One dead category must not sink the whole run.
        ctx.log(`${category}: FAILED -- ${err instanceof Error ? err.message : err}`)
      }

      index += 1
    }

    const done = index >= CATEGORIES.length
    return {
      listings,
      cursor: done ? {} : { categoryIndex: index },
      done,
    }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const e = raw.payload as JsonLdEvent
    if (!e?.name || !e?.url) return null

    // schema.org gives this explicitly, which is far more reliable than
    // sniffing the venue string for the word "online".
    const isOnline = (e.eventAttendanceMode ?? '').includes('Online')

    const { venue, city } = placeOf(e.location)

    // startDate is often "2026-08-01" with no time, and sometimes
    // "2026-08-01T18:00" with no offset. parseIsoLike reads a missing offset
    // as IST rather than UTC, which is what keeps evening events on the
    // correct day.
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
      // A real start time, unlike the hackathon feeds.
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
