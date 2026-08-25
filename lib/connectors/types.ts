import type { DateKind, DatePrecision } from '@/lib/dates/types'

/**
 * A listing exactly as the source returned it.
 *
 * `payload` is stored untouched in `raw_listings` so a later extraction fix
 * can be replayed over history without re-scraping anyone -- which matters
 * when the free-tier LLM quota is the binding constraint.
 */
export interface RawListing {
  /**
   * Stable identity within the source, WITH a discriminator.
   *
   * A bare slug is not enough: annual events reuse them, so next year's
   * listing would overwrite this year's row, keep its `first_seen_at`, and
   * therefore never show up as new. iCal has the mirror problem -- a UID is
   * stable per series, not per occurrence, so six occurrences would collapse
   * into one row.
   */
  sourceUid: string
  payload: unknown
  /** Set only by connectors with `needsLLM`. Pre-truncated, HTML stripped. */
  textForLLM?: string
}

/** The subset of an event a connector can determine on its own. */
export interface PartialEvent {
  title: string
  description?: string | null
  url: string
  canonicalUrl?: string | null
  imageUrl?: string | null
  organizer?: string | null

  startsAtLocal?: string | null
  endsAtLocal?: string | null
  tz?: string
  startsAt?: Date | null
  endsAt?: Date | null
  registrationDeadline?: Date | null
  datePrecision?: DatePrecision
  dateKind?: DateKind

  isOnline?: boolean
  city?: string | null
  /** ISO code or name from structured data. The one geo signal that is definitive. */
  country?: string | null
  venue?: string | null
  eventType?: string | null
  tags?: string[]
  priceType?: 'free' | 'paid' | 'unknown'
  priceAmount?: number | null
  priceCurrency?: string | null
}

export interface FetchContext {
  /** Where the last run stopped. Connectors resume from this. */
  cursor: Record<string, unknown>
  /** Stop fetching once this many listings are collected. */
  maxListings: number
  /** Rate-limited, retrying fetch. Connectors must not call global fetch. */
  get(url: string, init?: RequestInit): Promise<Response>
  log(message: string): void
}

export interface FetchResult {
  listings: RawListing[]
  /** Persisted to `sources.cursor` for the next run. */
  cursor: Record<string, unknown>
  /**
   * False means there is more to fetch and the run should be recorded as
   * `partial`. AllEvents at a 10s delay cannot finish in one pass.
   */
  done: boolean
}

export interface Connector {
  id: string

  /**
   * Whether normalization needs a model. Devpost, Unstop, AllEvents and Luma
   * return structured data and must never touch the LLM -- that decision is
   * what keeps this inside a free tier.
   */
  needsLLM: boolean

  /**
   * Payload fields excluded from `content_hash` because they churn on their
   * own. Devpost ships `time_left_to_submission` and `registrations_count`,
   * both of which change daily; hashing them would insert a fresh raw row for
   * every hackathon every day and re-score the whole corpus along with it.
   */
  volatileFields: string[]

  fetchRaw(ctx: FetchContext): Promise<FetchResult>

  /**
   * Deterministic mapping. Omit only when `needsLLM` is true.
   * Returning null drops the listing (with a reason logged), rather than
   * writing a half-parsed event.
   */
  toEvent?(raw: RawListing): PartialEvent | null
}
