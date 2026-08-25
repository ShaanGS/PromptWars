import { parseIsoLike } from '@/lib/dates/parse'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities, stripHtml } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Bevy -- the community-events platform behind GDG (gdg.community.dev),
 * Friends of Figma (friends.figma.com) and MuleSoft Meetups
 * (meetups.mulesoft.com). One connector, instantiated per community.
 *
 * All three share a robots.txt that disallows `/api/` for `*` -- so the
 * JSON API is off the table, and this connector reads what the ALLOWED
 * pages server-render into `__NEXT_DATA__` instead: the chapter page for
 * the upcoming list, then each event's detail page for the full object
 * (the list is a slim projection with no venue or end time). Crawl-delay 2
 * is published and honoured via each source's crawlDelayMs.
 *
 * A chapter between events (upcoming: []) is a normal, successful run of
 * zero listings -- GDG sleeps between flagships. Not a broken connector.
 */

interface BevySlimEvent {
  url?: string
  cohost_registration_url?: string
  title?: string
}

interface BevyEvent {
  id?: number
  title?: string
  description?: string
  description_short?: string
  url?: string
  start_date_iso?: string
  end_date_iso?: string
  is_virtual_event?: boolean
  venue_name?: string | null
  venue_address?: string | null
  venue_city?: string | null
  cropped_banner_url?: string | null
  cropped_picture_url?: string | null
  chapter_title?: string
}

export function extractNextData(html: string): unknown {
  const match =
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/.exec(html)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function upcomingFrom(nextData: unknown): BevySlimEvent[] {
  const d = nextData as {
    props?: { pageProps?: { prerenderData?: { upcomingEvents?: { results?: BevySlimEvent[] } } } }
  }
  return d?.props?.pageProps?.prerenderData?.upcomingEvents?.results ?? []
}

function eventFrom(nextData: unknown): BevyEvent | null {
  const d = nextData as { props?: { pageProps?: { eventData?: BevyEvent } } }
  return d?.props?.pageProps?.eventData ?? null
}

export function makeBevyConnector(
  id: string,
  chapterUrl: string,
  /** Used when the chapter title is just the city ("by Chennai" is not an organizer). */
  fallbackOrganizer: string,
): Connector {
  return {
    id,
    needsLLM: false,
    // Countdown fields churn on their own; they never reach the payload we
    // store because toEvent reads named fields, but exclude them from the
    // hash anyway so a re-fetched payload stays stable.
    volatileFields: ['minutes_until_start'],

    async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
      const res = await ctx.get(chapterUrl)
      const upcoming = upcomingFrom(extractNextData(await res.text()))
      ctx.log(`${chapterUrl}: ${upcoming.length} upcoming`)

      const listings: RawListing[] = []
      const seen = new Set<string>()
      for (const slim of upcoming) {
        if (listings.length >= ctx.maxListings) break
        const detailUrl = slim.url ?? slim.cohost_registration_url
        if (!detailUrl || seen.has(detailUrl)) continue
        seen.add(detailUrl)
        try {
          const page = await ctx.get(detailUrl)
          const event = eventFrom(extractNextData(await page.text()))
          if (!event?.id || !event.title) continue
          listings.push({ sourceUid: String(event.id), payload: event })
        } catch (err) {
          ctx.log(`${detailUrl}: FAILED -- ${err instanceof Error ? err.message : err}`)
        }
      }

      return { listings, cursor: {}, done: true }
    },

    toEvent(raw: RawListing): PartialEvent | null {
      const e = raw.payload as BevyEvent
      if (!e?.title || !e?.url) return null

      const start = parseIsoLike(e.start_date_iso, { tz: DEFAULT_TZ })
      const end = parseIsoLike(e.end_date_iso, { tz: DEFAULT_TZ })

      // A named venue outranks is_virtual_event: GDG's flagship carried
      // is_virtual_event=true while naming the Ford GTBC in Sholinganallur.
      const venue = e.venue_name?.trim() || null
      const isOnline = !venue && Boolean(e.is_virtual_event)

      return {
        title: decodeEntities(e.title),
        description: stripHtml(e.description_short ?? e.description)?.slice(0, 400) ?? null,
        url: e.url,
        canonicalUrl: e.url,
        imageUrl: e.cropped_banner_url ?? e.cropped_picture_url ?? null,
        organizer:
          e.chapter_title && e.chapter_title.trim().toLowerCase() !== 'chennai'
            ? e.chapter_title
            : fallbackOrganizer,

        startsAtLocal: start.local,
        endsAtLocal: end.local ?? start.local,
        startsAt: start.utc,
        endsAt: end.utc ?? start.utc,
        registrationDeadline: null,
        tz: DEFAULT_TZ,
        datePrecision: start.precision,
        dateKind: start.local ? 'start' : 'tba',

        isOnline,
        city: isOnline ? null : e.venue_city?.trim() || null,
        venue: venue ? [venue, e.venue_address?.trim()].filter(Boolean).join(', ') : null,
        eventType: null,
        tags: [],
        priceType: 'unknown',
        priceAmount: null,
        priceCurrency: null,
      }
    },
  }
}
