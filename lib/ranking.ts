import { DateTime } from 'luxon'
import { INTEREST_BY_ID, type InterestPrefs } from '@/config/interest-tags'
import { DEFAULT_TZ } from './dates/types'
import { isPremiumVenue } from './venues'

/**
 * Per-user fit, layered on the global quality score.
 *
 * The LLM score answers "is this a good event for someone like Shaan's
 * circle" -- quality. Fit answers "is it the kind of thing THIS person said
 * they like" -- tags, in person vs online, weekday vs weekend, how far. The
 * two multiply: rank = quality * (0.7 + 0.3 * fit). A strong event you did
 * not ask for still shows (90 -> 63, "Worth a look"); a weak one you did ask
 * for does not get promoted past its quality (60 -> 60).
 *
 * Pure and cheap: runs per request over the ~60 rows the feed already
 * fetched. No SQL, no LLM per user. Returns the reasons so the card can say
 * "For you · Startups" instead of being a black box.
 */
export type Rankable = {
  title: string
  description: string | null
  tags: string[] | null
  event_type: string | null
  is_online: boolean
  city: string | null
  venue: string | null
  price_type: string
  starts_at_local: string | null
  relevance_score: number | null
}

/**
 * Free + in-person + premium venue -> the top of the feed (Shaan's rule,
 * 2026-08-24). The venue is the signal: an organizer who books a five-star
 * ballroom and charges nothing is curating the room. The floor of 82 lands
 * the event in Top picks; anything eligible here already cleared the geo
 * and quality gates, so junk cannot ride the rule (sub-floor events never
 * reach the feed at all). Ranking only — nothing in the UI names it.
 */
function prestigeRank(event: Rankable, rank: number | null): number | null {
  if (rank === null) return null
  if (event.is_online || event.price_type !== 'free' || !isPremiumVenue(event.venue)) return rank
  return Math.min(100, Math.max(rank + 20, 82))
}

export type Interests = {
  tags: string[]
  prefs: InterestPrefs
}

export type Fit = {
  /** 0..1 */
  score: number
  /** Matched tag labels, most specific first. Empty = no personal signal. */
  reasons: string[]
  /** Quality score re-weighted by fit. Null when unscored. */
  rank: number | null
}

export function fitFor(event: Rankable, interests: Interests | null): Fit {
  const quality = event.relevance_score
  if (!interests || interests.tags.length === 0) {
    return { score: 0.5, reasons: [], rank: prestigeRank(event, quality) }
  }

  const hay = [
    event.title,
    event.description ?? '',
    (event.tags ?? []).join(' '),
    event.event_type ?? '',
  ]
    .join(' ')
    .toLowerCase()

  const reasons: string[] = []
  for (const id of interests.tags) {
    const tag = INTEREST_BY_ID[id]
    if (tag && tag.match.test(hay)) reasons.push(tag.label)
  }
  // Tag fit: one match is most of the value, a second adds a little.
  let score = reasons.length === 0 ? 0.15 : reasons.length === 1 ? 0.8 : 1

  const { mode, days, area } = interests.prefs
  if (mode === 'inperson' && event.is_online) score -= 0.25
  if (mode === 'online' && !event.is_online) score -= 0.15
  if (days && days !== 'both' && event.starts_at_local) {
    const dt = DateTime.fromISO(event.starts_at_local, { zone: DEFAULT_TZ })
    if (dt.isValid) {
      const weekend = dt.weekday >= 6
      if (days === 'weekends' && !weekend) score -= 0.15
      if (days === 'weekdays' && weekend) score -= 0.1
    }
  }
  if (area === 'chennai' && !event.is_online && event.city && !/chennai/i.test(event.city)) {
    score -= 0.2
  }

  score = Math.max(0, Math.min(1, score))
  const rank = quality === null ? null : Math.round(quality * (0.7 + 0.3 * score))
  return { score, reasons, rank: prestigeRank(event, rank) }
}

/** Stable sort by rank desc, then quality desc, then start asc. */
export function rankEvents<T extends Rankable & { starts_at: string | null }>(
  events: T[],
  interests: Interests | null,
): Array<T & { fit: Fit }> {
  return events
    .map((e) => ({ ...e, fit: fitFor(e, interests) }))
    .sort((a, b) => {
      const ra = a.fit.rank ?? -1
      const rb = b.fit.rank ?? -1
      if (rb !== ra) return rb - ra
      const qa = a.relevance_score ?? -1
      const qb = b.relevance_score ?? -1
      if (qb !== qa) return qb - qa
      return (a.starts_at ?? '').localeCompare(b.starts_at ?? '')
    })
}
