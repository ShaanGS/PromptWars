import { parseIsoLike } from '@/lib/dates/parse'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities, stripHtml } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Unstop -- https://unstop.com/api/public/opportunity/search-result
 *
 * Public JSON, no auth, and its robots.txt explicitly allows /api/public/*.
 * The HTML site is a 23KB SPA shell that datacenter fetches get blocked from,
 * so the API is not merely the convenient path, it is the only viable one.
 *
 * Unlike Devpost this returns real ISO timestamps with offsets, so the date
 * handling is genuinely simple here. What it does NOT return is a start time:
 * `end_date` is the registration close. Same shape as Devpost, so the same
 * `deadline` treatment applies.
 */

interface UnstopOrganisation {
  name?: string
}

interface UnstopFilter {
  name?: string
}

interface UnstopItem {
  id: number
  title: string
  seo_url?: string
  public_url?: string
  type?: string
  subtype?: string
  region?: string
  details?: string
  organisation?: UnstopOrganisation
  end_date?: string
  isPaid?: boolean
  filters?: UnstopFilter[] | string[]
  // Deliberately unmapped -- see volatileFields.
  viewsCount?: number
  registerCount?: number
  updated_at?: string
}

interface UnstopResponse {
  data?: {
    current_page?: number
    last_page?: number
    total?: number
    data?: UnstopItem[]
  }
}

const BASE = 'https://unstop.com/api/public/opportunity/search-result'
const PER_PAGE = 30

/** The categories worth pulling. `conferences` is thin but cheap to include. */
const OPPORTUNITY_TYPES = ['hackathons', 'competitions', 'conferences']

function filterNames(filters: UnstopItem['filters']): string[] {
  if (!Array.isArray(filters)) return []
  return filters
    .map((f) => (typeof f === 'string' ? f : f?.name))
    .filter((n): n is string => Boolean(n))
}

export const unstopConnector: Connector = {
  id: 'unstop',
  needsLLM: false,

  /** All three move on their own between runs. */
  volatileFields: ['viewsCount', 'registerCount', 'updated_at'],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const listings: RawListing[] = []
    const seen = new Set<string>()

    for (const type of OPPORTUNITY_TYPES) {
      let page = 1
      while (listings.length < ctx.maxListings) {
        const url = `${BASE}?opportunity=${type}&page=${page}&per_page=${PER_PAGE}&oppstatus=open`
        const res = await ctx.get(url)
        const body = (await res.json()) as UnstopResponse
        const batch = body.data?.data ?? []

        ctx.log(`${type} page ${page}: ${batch.length} (total ${body.data?.total ?? '?'})`)

        for (const item of batch) {
          // Unstop ids are numeric primary keys, unique across categories, so
          // no year discriminator is needed -- but an item can surface under
          // more than one opportunity type, hence the dedupe.
          const uid = String(item.id)
          if (seen.has(uid)) continue
          seen.add(uid)
          listings.push({ sourceUid: uid, payload: item })
        }

        const lastPage = body.data?.last_page ?? page
        if (page >= lastPage || batch.length === 0) break
        page += 1
      }
    }

    return { listings, cursor: {}, done: true }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const item = raw.payload as UnstopItem
    if (!item?.title) return null

    // Quizzes arrive inside the competitions results and are not events in any
    // useful sense -- an online aptitude test is not something you go to or
    // build at. 39 of the first live run's 371 listings were these. The raw
    // payload is still stored; only the event upsert is skipped.
    if (item.type === 'quizzes') return null

    const url = item.seo_url ?? (item.public_url ? `https://unstop.com/${item.public_url}` : null)
    if (!url) return null

    const isOnline = (item.region ?? '').toLowerCase() === 'online'
    const organizer = item.organisation?.name?.trim() || null

    // `end_date` is when registration closes, not when anything starts.
    const deadline = parseIsoLike(item.end_date, { tz: DEFAULT_TZ })

    // The description is a wall of HTML. Strip it and keep only enough to
    // characterise the event -- it feeds the scoring hash, and a longer blob
    // means more tokens for no extra signal.
    const description = stripHtml(item.details)?.slice(0, 400) ?? null

    // Offline listings leave `locations` empty and put the city in the
    // organisation name ("... College of Engineering (YCCE), Nagpur"), so
    // that string is the only geographic signal available.
    const venue = isOnline ? 'Online' : organizer

    return {
      title: decodeEntities(item.title),
      description,
      url,
      canonicalUrl: url,
      organizer,

      startsAtLocal: deadline.local,
      endsAtLocal: deadline.local,
      startsAt: deadline.utc,
      endsAt: deadline.utc,
      registrationDeadline: deadline.utc,
      tz: DEFAULT_TZ,
      datePrecision: deadline.precision,
      dateKind: deadline.local ? 'deadline' : 'tba',

      isOnline,
      city: isOnline ? null : null,
      venue,
      eventType: item.type === 'hackathons' ? 'hackathon' : (item.type ?? null),
      tags: filterNames(item.filters).slice(0, 5),
      priceType: item.isPaid === false ? 'free' : item.isPaid ? 'paid' : 'unknown',
    }
  },
}
