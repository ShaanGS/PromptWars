import { DateTime } from 'luxon'
import ical from 'node-ical'
import { LUMA_CALENDARS } from '@/config/luma-calendars'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities, stripHtml } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Luma, via per-calendar iCal feeds.
 *
 * Two things make this the awkward source. Luma has no Chennai discover page,
 * so the calendar list is curated by hand in config/luma-calendars.ts. And the
 * ICS endpoint will not accept a vanity slug -- it needs the calendar's
 * internal `cal-XXXX` id, which only appears in the page HTML. So each run
 * resolves the slug first, then fetches the feed.
 */

const ICS_ENDPOINT = 'https://api.lu.ma/ics/get?entity=calendar&id='

/** How far ahead a recurring series is expanded. */
const RECURRENCE_HORIZON_DAYS = 120

interface LumaPayload {
  calendar: string
  uid: string
  summary: string
  description?: string
  location?: string
  url?: string
  startIso: string
  endIso?: string
  allDay: boolean
  occurrence?: string
  /** From the event page's JSON-LD, filled by the enrichment pass. */
  enriched?: {
    url?: string
    image?: string
    venue?: string
    city?: string
    country?: string
    isOnline?: boolean
  }
}

/**
 * The real event link, without any page fetch.
 *
 * Luma's ICS carries NO URL property. The vanity link hides inside the
 * DESCRIPTION text ("Get up-to-date information at: https://luma.com/xyz"),
 * LOCATION is abused to hold a URL, and failing both, the UID itself maps to
 * a canonical page: evt-XXX@events.lu.ma -> luma.com/event/evt-XXX.
 *
 * The old fallback -- the calendar page -- sent every click to the same
 * community listing instead of the event. Never fall back to that.
 */
function eventUrlOf(p: LumaPayload): string {
  const fromDescription = /https?:\/\/(?:lu\.ma|luma\.com)\/[^\s\\,)>"']+/.exec(
    p.description ?? '',
  )?.[0]
  if (fromDescription && !/\/(?:user|calendar)\//.test(fromDescription)) {
    return fromDescription
  }
  if (p.location && /^https?:\/\//.test(p.location)) return p.location
  const uidBase = p.uid.replace(/@events\.lu\.ma$/, '')
  return `https://luma.com/event/${uidBase}`
}

interface JsonLdEventLite {
  '@type'?: string
  image?: string | string[]
  eventAttendanceMode?: string
  location?:
    | string
    | {
        '@type'?: string
        name?: string
        address?: string | { addressLocality?: string; addressCountry?: string }
      }
}

/** First JSON-LD Event on a page, or null. Tolerant of malformed blocks. */
function firstJsonLdEvent(html: string): JsonLdEventLite | null {
  const blocks = [...html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  )
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.trim())
      const nodes = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of nodes) {
        if ((node as JsonLdEventLite)?.['@type'] === 'Event') {
          return node as JsonLdEventLite
        }
      }
    } catch {
      // A broken block on one page must not sink the enrichment pass.
    }
  }
  return null
}

/**
 * Enrichment fetches per run. ~166 future events at a 2s crawl delay is about
 * six minutes -- fine for CI, but capped so a runaway calendar list cannot
 * turn the daily ingest into an hour of page fetches.
 */
const MAX_ENRICH = 200

/**
 * Resolve a config entry to a calendar id.
 *
 * Three forms, because Luma publishes calendars three ways and a good number
 * of the most active Chennai hosts do NOT have a vanity slug:
 *
 *   chennai-react              vanity slug        -> lu.ma/chennai-react
 *   cal-uaOoiMOMK1GBj8u        raw calendar id    -> used directly
 *   user/CodeonJVM             personal calendar  -> lu.ma/user/CodeonJVM
 *
 * Only the first form needs a page fetch; a raw id short-circuits.
 */
async function resolveCalendarId(entry: string, ctx: FetchContext): Promise<string | null> {
  if (entry.startsWith('cal-')) return entry

  const res = await ctx.get(`https://lu.ma/${entry}`)
  const html = await res.text()
  const match = /"(cal-[A-Za-z0-9]{6,})"/.exec(html)
  return match?.[1] ?? null
}

/**
 * node-ical's published types do not surface `rrule` or `datetype`, both of
 * which the library populates at runtime. Describing the shape we actually
 * rely on is more honest than casting each access away.
 */
interface VEventLike {
  type: 'VEVENT'
  uid?: string
  summary?: string
  description?: string
  location?: string
  url?: string
  start: Date
  end?: Date
  datetype?: string
  rrule?: { between(after: Date, before: Date, inclusive?: boolean): Date[] }
}

/** node-ical hands back a mixed bag; only VEVENTs matter. */
function isVEvent(value: unknown): value is VEventLike {
  const v = value as { type?: string; start?: unknown }
  return (
    typeof value === 'object' && value !== null && v.type === 'VEVENT' && v.start instanceof Date
  )
}

/**
 * RFC 5545 makes DTEND *exclusive* for all-day events, so a one-day event
 * carries DTEND = the next day. Mapping it straight through renders every
 * all-day Luma event as lasting two days.
 */
function inclusiveEnd(end: Date, allDay: boolean): Date {
  if (!allDay) return end
  return new Date(end.getTime() - 86_400_000)
}

export const lumaConnector: Connector = {
  id: 'luma',
  needsLLM: false,
  // The enrichment block is derived from a page fetch, and CDN image URLs
  // are not guaranteed byte-stable between runs. Excluding it keeps a
  // wobbling image URL from minting a fresh raw_listings row every day.
  // Events still pick the values up each run -- toEvent reads the live
  // payload, not the stored one.
  volatileFields: ['enriched'],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const listings: RawListing[] = []
    // Deliberately outside the calendar loop -- cross-posting happens BETWEEN
    // calendars, so a per-calendar set would not catch it.
    const seen = new Set<string>()
    const horizon = DateTime.now().setZone(DEFAULT_TZ).plus({
      days: RECURRENCE_HORIZON_DAYS,
    })
    const now = DateTime.now().setZone(DEFAULT_TZ).minus({ days: 1 })

    for (const slug of LUMA_CALENDARS) {
      try {
        const calendarId = await resolveCalendarId(slug, ctx)
        if (!calendarId) {
          // Loud but not fatal -- one bad slug must not sink the others.
          ctx.log(`${slug}: could not resolve a cal- id, skipping`)
          continue
        }

        const res = await ctx.get(`${ICS_ENDPOINT}${calendarId}`)
        const text = await res.text()
        const parsed = ical.sync.parseICS(text)

        let count = 0
        for (const value of Object.values(parsed)) {
          if (!isVEvent(value)) continue
          const event = value
          const allDay = event.datetype === 'date'

          // A UID is stable per *series*, not per occurrence. Without a
          // discriminator, six occurrences of a monthly meetup collapse into
          // one row and five silently vanish.
          const occurrences: Array<{ start: Date; end?: Date; key?: string }> = []

          if (event.rrule) {
            const dates = event.rrule.between(now.toJSDate(), horizon.toJSDate(), true)
            const durationMs = event.end ? event.end.getTime() - event.start.getTime() : 0
            for (const start of dates) {
              occurrences.push({
                start,
                end: durationMs ? new Date(start.getTime() + durationMs) : undefined,
                key: start.toISOString().slice(0, 10),
              })
            }
          } else {
            occurrences.push({ start: event.start, end: event.end })
          }

          for (const occ of occurrences) {
            const startDt = DateTime.fromJSDate(occ.start).setZone(DEFAULT_TZ)
            if (!startDt.isValid) continue

            // Drop the archive. Luma feeds carry a calendar's entire history --
            // CommunityMeetups alone returns ~2,700 past events -- and storing
            // them would bloat raw_listings for nothing, since the dashboard
            // only ever queries forward. `now` is already a day back, which
            // keeps events currently running.
            if (startDt < now) continue

            const payload: LumaPayload = {
              calendar: slug,
              uid: String(event.uid),
              summary: String(event.summary ?? ''),
              description: event.description ? String(event.description) : undefined,
              location: event.location ? String(event.location) : undefined,
              url: event.url ? String(event.url) : undefined,
              startIso: startDt.toISO() ?? '',
              endIso: occ.end
                ? (DateTime.fromJSDate(inclusiveEnd(occ.end, allDay)).setZone(DEFAULT_TZ).toISO() ??
                  undefined)
                : undefined,
              allDay,
              occurrence: occ.key,
            }

            const uid = occ.key ? `${event.uid}::${occ.key}` : String(event.uid)

            // Aggregators cross-post: CommunityMeetups carries events that
            // also live on chennai-react, gdgchennai and the rest, so the same
            // Luma UID arrives more than once per run. Keeping both would make
            // Postgres reject the whole batch ("cannot affect row a second
            // time").
            //
            // First write wins, and because the config lists local calendars
            // before aggregators, the specific host keeps the attribution
            // rather than the firehose.
            if (seen.has(uid)) continue
            seen.add(uid)

            listings.push({ sourceUid: uid, payload })
            count++
          }
        }
        ctx.log(`${slug} (${calendarId}): ${count} events`)
      } catch (err) {
        ctx.log(`${slug}: FAILED -- ${err instanceof Error ? err.message : err}`)
      }
    }

    // --- enrichment pass -----------------------------------------------
    // The ICS gives us no image and no real venue (LOCATION holds a URL).
    // Each event's own page carries JSON-LD with all three, so fetch the
    // pages -- future events only, already deduped, capped. A failed page
    // never drops the event; it just ships without an image.
    let enriched = 0
    let enrichFailed = 0
    for (const listing of listings.slice(0, MAX_ENRICH)) {
      const payload = listing.payload as LumaPayload
      try {
        const res = await ctx.get(eventUrlOf(payload))
        const html = await res.text()
        const ld = firstJsonLdEvent(html)
        const og = /property="og:image" content="([^"]+)"/.exec(html)?.[1]
        if (!ld && !og) continue

        const image = Array.isArray(ld?.image) ? ld?.image[0] : ld?.image
        const loc = ld?.location
        const isVirtual =
          (typeof loc === 'object' && loc?.['@type'] === 'VirtualLocation') ||
          (ld?.eventAttendanceMode ?? '').includes('Online')
        const venue = typeof loc === 'object' ? (loc?.name ?? undefined) : loc
        const address = typeof loc === 'object' ? loc?.address : undefined
        const city = typeof address === 'object' ? address?.addressLocality : undefined
        const country = typeof address === 'object' ? address?.addressCountry : undefined

        payload.enriched = {
          // The page's final URL is the vanity link after the redirect.
          url: res.url && !res.url.includes('/event/evt-') ? res.url : undefined,
          image: image ?? og,
          venue: isVirtual ? undefined : venue,
          city: isVirtual ? undefined : city,
          country: isVirtual ? undefined : country,
          isOnline: isVirtual || undefined,
        }
        enriched++
      } catch {
        enrichFailed++
      }
    }
    ctx.log(
      `enriched ${enriched}/${listings.length} from event pages` +
        (enrichFailed ? ` (${enrichFailed} pages failed)` : '') +
        (listings.length > MAX_ENRICH ? ` (capped at ${MAX_ENRICH})` : ''),
    )

    return { listings, cursor: {}, done: true }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const p = raw.payload as LumaPayload
    if (!p?.summary || !p?.startIso) return null

    const start = DateTime.fromISO(p.startIso, { zone: DEFAULT_TZ })
    const end = p.endIso ? DateTime.fromISO(p.endIso, { zone: DEFAULT_TZ }) : null
    if (!start.isValid) return null

    // LOCATION is a URL in Luma's ICS, not a venue -- never show it as one.
    // The real venue comes from the enrichment pass when the page had it.
    const rawLocation = p.location && !/^https?:\/\//.test(p.location) ? p.location : null
    const venue = p.enriched?.venue ?? rawLocation
    const isOnline =
      p.enriched?.isOnline ??
      /zoom|online|virtual|meet\.google|hangout/i.test(
        `${rawLocation ?? ''} ${p.description ?? ''}`,
      )

    const url = p.enriched?.url ?? eventUrlOf(p)

    return {
      title: decodeEntities(p.summary),
      // The ICS description leads with the "Get up-to-date information at"
      // boilerplate; strip it so cards show actual content.
      description:
        stripHtml(p.description)
          ?.replace(/^Get up-to-date information at:?\s*\S+\s*/i, '')
          .slice(0, 400) || null,
      url,
      canonicalUrl: url,
      imageUrl: p.enriched?.image ?? null,
      organizer: p.calendar,

      startsAtLocal: start.toFormat("yyyy-MM-dd'T'HH:mm:ss"),
      endsAtLocal: end?.isValid ? end.toFormat("yyyy-MM-dd'T'HH:mm:ss") : null,
      startsAt: start.toJSDate(),
      endsAt: end?.isValid ? end.toJSDate() : null,
      registrationDeadline: null,
      tz: DEFAULT_TZ,
      // An all-day entry must render as "12 Aug", never "12 Aug, 12:00 AM".
      datePrecision: p.allDay ? 'day' : 'instant',
      dateKind: 'start',

      isOnline,
      city: isOnline ? null : (p.enriched?.city ?? null),
      country: isOnline ? null : (p.enriched?.country ?? null),
      venue,
      eventType: null,
      tags: [],
      priceType: 'unknown',
    }
  },
}
