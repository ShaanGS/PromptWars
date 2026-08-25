import { parseRangeBorrowingContext } from '@/lib/dates/parse'
import { DEVPOST_FORMATS } from '@/lib/dates/sources'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Devpost -- https://devpost.com/api/hackathons
 *
 * Public JSON, no auth. robots.txt is fully open and does not disallow /api/,
 * but it blocks GPTBot, CCBot and anthropic-ai by name, so the fetcher must
 * not present as an AI agent. See config/sources.ts.
 *
 * The important thing about this source: it has NO start time. It returns a
 * submission window as a display string and zero ISO timestamps. Mapping the
 * window's end to `starts_at` would render "31 Jul" for a hackathon you could
 * join today, pushing it down a date-sorted list -- the exact failure this
 * project exists to prevent. So everything here is `date_kind = 'deadline'`.
 */

interface DevpostLocation {
  icon?: string
  location?: string
}

interface DevpostTheme {
  id: number
  name: string
}

interface DevpostHackathon {
  id: number
  title: string
  url: string
  displayed_location?: DevpostLocation
  open_state?: string
  submission_period_dates?: string
  themes?: DevpostTheme[]
  prize_amount?: string
  organization_name?: string
  invite_only?: boolean
  // Deliberately not mapped -- see volatileFields.
  time_left_to_submission?: string
  registrations_count?: number
}

interface DevpostResponse {
  hackathons?: DevpostHackathon[]
  meta?: { total_count?: number; per_page?: number }
}

const BASE = 'https://devpost.com/api/hackathons'
const PER_PAGE = 50

/** `prize_amount` arrives as "$<span data-currency-value>10,300</span>". */
function stripHtml(input: string | undefined | null): string | null {
  if (!input) return null
  const text = input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

export const devpostConnector: Connector = {
  id: 'devpost',
  needsLLM: false,

  /**
   * Both of these change every single day. Hashing them would write a new raw
   * row for every hackathon daily and, downstream, re-score the entire corpus
   * along with it.
   */
  volatileFields: ['time_left_to_submission', 'registrations_count'],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const page = typeof ctx.cursor.page === 'number' ? ctx.cursor.page : 1
    const listings: RawListing[] = []
    let currentPage = page
    let done = false

    while (listings.length < ctx.maxListings) {
      const url =
        `${BASE}?search=india` +
        `&status[]=upcoming&status[]=open` +
        `&per_page=${PER_PAGE}&page=${currentPage}`

      const res = await ctx.get(url)
      const body = (await res.json()) as DevpostResponse
      const batch = body.hackathons ?? []

      ctx.log(
        `page ${currentPage}: ${batch.length} listings (total ${body.meta?.total_count ?? '?'})`,
      )

      for (const h of batch) {
        // Devpost ids are numeric primary keys, not slugs, so unlike the
        // HTML sources they are never reused by next year's edition and need
        // no year discriminator.
        listings.push({ sourceUid: String(h.id), payload: h })
      }

      if (batch.length < PER_PAGE) {
        done = true
        currentPage += 1
        break
      }
      currentPage += 1
    }

    // Start from the top next run: hackathons are added and removed
    // continuously, and a whole pass is cheap on a JSON API.
    return { listings, cursor: done ? {} : { page: currentPage }, done }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const h = raw.payload as DevpostHackathon
    if (!h?.title || !h?.url) return null

    const locationText = h.displayed_location?.location ?? null
    const isOnline = /online|virtual|anywhere/i.test(locationText ?? '')

    const range = parseRangeBorrowingContext(h.submission_period_dates, DEVPOST_FORMATS, {
      tz: DEFAULT_TZ,
    })

    const prize = stripHtml(h.prize_amount)

    return {
      title: decodeEntities(h.title),
      // Kept minimal and stable. registrations_count would be the obvious
      // thing to include and is exactly what must stay out: it changes daily
      // and feeds the scoring hash.
      description: prize ? `Hackathon. Prizes: ${prize}.` : 'Hackathon.',
      url: h.url,
      canonicalUrl: h.url,
      organizer: h.organization_name?.trim() || null,

      // The window opens at `start` and closes at `end`. We surface the close
      // date, because that is the date that can cost you the event.
      startsAtLocal: range?.start.local ?? null,
      endsAtLocal: range?.end.local ?? null,
      startsAt: range?.start.utc ?? null,
      endsAt: range?.end.utc ?? null,
      registrationDeadline: range?.end.utc ?? null,
      tz: DEFAULT_TZ,
      datePrecision: range?.end.precision ?? 'unknown',
      dateKind: range ? 'deadline' : 'tba',

      isOnline,
      city: isOnline ? null : locationText,
      venue: locationText,
      eventType: 'hackathon',
      tags: (h.themes ?? []).map((t) => t.name).filter(Boolean),
      // Devpost hackathons are free to enter; `prize_amount` is winnings, not
      // a ticket price.
      priceType: 'free',
    }
  },
}
