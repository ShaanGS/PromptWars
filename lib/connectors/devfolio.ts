import { parseIsoLike } from '@/lib/dates/parse'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities, stripHtml } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Devfolio -- https://api.devfolio.co/api/search/hackathons
 *
 * The search endpoint behind devfolio.co/hackathons. Public, no auth, and
 * devfolio.co/robots.txt is `Disallow:` with nothing after it -- the most
 * permissive there is. It is a POST because the endpoint is an
 * Elasticsearch-style query, not because anything is being written.
 *
 * The best-shaped hackathon source we have. Unlike Devpost (a display string
 * and no timestamps) and Unstop (a registration cutoff and no start at all),
 * Devfolio returns BOTH: a real start and end for the event, and
 * `hackathon_setting.reg_ends_at` for when applications close. So these are
 * ordinary `start` events that also carry a deadline -- the card shows the
 * date it runs and the "closes in N days" pill, and Saved and the calendar
 * place it on the day it actually happens.
 *
 * `location` is a full postal address, which is the strongest geographic
 * signal any of our sources provides, and `country` is structured -- between
 * them the geo classifier can be trusted here.
 */

interface DevfolioSetting {
  reg_ends_at?: string
  reg_starts_at?: string
  subdomain?: string
  site?: string
}

interface DevfolioTheme {
  name?: string
}

interface DevfolioHackathon {
  uuid: string
  name: string
  slug?: string
  tagline?: string | null
  desc?: string | null
  cover_img?: string | null
  starts_at?: string | null
  ends_at?: string | null
  is_online?: boolean
  location?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  timezone?: string | null
  themes?: DevfolioTheme[] | string[]
  status?: string
  type?: string
  hackathon_setting?: DevfolioSetting
  // Deliberately not mapped -- see volatileFields.
  participants_count?: number
  projects_submitted?: number
  rating?: number
}

interface DevfolioResponse {
  hits?: {
    total?: { value?: number }
    hits?: Array<{ _source?: DevfolioHackathon }>
  }
}

const BASE = 'https://api.devfolio.co/api/search/hackathons'
const PAGE_SIZE = 50

/**
 * Only hackathons you can still apply to.
 *
 * The endpoint also serves `application_closed` and past editions. Those are
 * not something anyone can act on, and this source exists to answer "what can
 * I enter" -- so they are not fetched at all rather than fetched and filtered.
 */
const SEARCH_TYPE = 'application_open'

function themeNames(themes: DevfolioHackathon['themes']): string[] {
  if (!Array.isArray(themes)) return []
  return themes
    .map((t) => (typeof t === 'string' ? t : t?.name))
    .filter((n): n is string => Boolean(n))
    .slice(0, 5)
}

export const devfolioConnector: Connector = {
  id: 'devfolio',
  needsLLM: false,

  /** All three move between runs while the listing itself is unchanged. */
  volatileFields: ['participants_count', 'projects_submitted', 'rating'],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const listings: RawListing[] = []
    let from = 0
    let total = Infinity

    while (listings.length < ctx.maxListings && from < total) {
      const res = await ctx.get(BASE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: SEARCH_TYPE, from, size: PAGE_SIZE }),
      })
      const body = (await res.json()) as DevfolioResponse
      const batch = body.hits?.hits ?? []
      total = body.hits?.total?.value ?? batch.length

      ctx.log(`from ${from}: ${batch.length} listings (total ${total})`)

      for (const hit of batch) {
        const h = hit._source
        // The uuid is the hackathon's primary key and is not reused by next
        // year's edition, which reruns under a new one.
        if (h?.uuid) listings.push({ sourceUid: h.uuid, payload: h })
      }

      if (!batch.length) break
      from += batch.length
    }

    // No cursor: the whole open set is two requests at most.
    return { listings, cursor: {}, done: true }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const h = raw.payload as DevfolioHackathon
    if (!h?.name || !h?.slug) return null

    const start = parseIsoLike(h.starts_at, { tz: DEFAULT_TZ })
    const end = parseIsoLike(h.ends_at, { tz: DEFAULT_TZ })
    const regEnds = parseIsoLike(h.hackathon_setting?.reg_ends_at, { tz: DEFAULT_TZ })

    // A hackathon with no dates at all is a draft page, not a listing.
    if (!start.utc && !regEnds.utc) return null

    // `desc` is the full event page in markdown -- thousands of characters,
    // all of which would feed the scoring hash for no extra signal. The
    // tagline is what the organiser wrote as the one-line pitch.
    const tagline = h.tagline?.trim() ? decodeEntities(h.tagline.trim()) : null
    const body = stripHtml(h.desc)?.slice(0, 400) ?? null
    const description = tagline && body ? `${tagline}. ${body}` : (tagline ?? body)

    return {
      title: decodeEntities(h.name),
      description,
      url: `https://${h.slug}.devfolio.co/`,
      canonicalUrl: `https://${h.slug}.devfolio.co/`,
      imageUrl: h.cover_img ?? null,
      organizer: null,

      // A real start, unlike the other two hackathon sources -- so this is a
      // 'start' event that happens to carry a deadline, and every surface
      // that places events by date puts it on the day it runs.
      startsAtLocal: start.local,
      endsAtLocal: end.local ?? start.local,
      startsAt: start.utc,
      endsAt: end.utc,
      registrationDeadline: regEnds.utc,
      tz: DEFAULT_TZ,
      datePrecision: start.precision,
      dateKind: start.utc ? 'start' : 'deadline',

      isOnline: Boolean(h.is_online),
      city: h.city ?? null,
      // Structured and definitive: this is what filters the occasional
      // Munich or Singapore listing without any keyword list.
      country: h.country ?? null,
      // The full postal address, which is the venue and the geographic
      // evidence at once ("…, Kalyani, West Bengal, India").
      venue: h.location ?? (h.is_online ? 'Online' : null),
      eventType: 'hackathon',
      tags: themeNames(h.themes),
      // Devfolio hackathons do not charge entry.
      priceType: 'free',
    }
  },
}
