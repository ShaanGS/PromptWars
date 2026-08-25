import { DateTime } from 'luxon'
import { PROFILE_HASH, SCORING_VERSION } from '@/config/interest-profile'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { scoringHash } from '@/lib/hash'
import { complete } from '@/lib/llm/provider'
import { canonicalizeUrl, inferArea, normalizeOrganizer, normalizeTitle } from '@/lib/text'

/**
 * Hand-picked events: the LinkedIn gap, closed by a paste.
 *
 * The high-signal summits (AMA at the Grand Chola, DevSparks at the Hyatt)
 * surface as LinkedIn posts, and scraping LinkedIn is off the table — so the
 * human who already saw the post is the connector. Paste the post, an LLM
 * drafts the fields, the admin corrects them, and the row joins the pipeline
 * as source `manual` with everything a scraped event has.
 *
 * Hand-picked rows score 85 with reason "Hand-picked" and the scorer skips
 * them: the human deciding an event matters IS the relevance judgment, and a
 * model second-guessing it downward would undo the whole point.
 */

export interface ExtractedDraft {
  title: string | null
  description: string | null
  url: string | null
  /** YYYY-MM-DD */
  date: string | null
  /** HH:MM, 24h */
  time: string | null
  endDate: string | null
  venue: string | null
  city: string | null
  isOnline: boolean
  priceType: 'free' | 'paid' | 'unknown'
  organizer: string | null
  tags: string[]
}

/** Gemini structured-output schema; the prompt restates it for Groq. */
const EXTRACT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', nullable: true },
    description: { type: 'STRING', nullable: true },
    url: { type: 'STRING', nullable: true },
    date: { type: 'STRING', nullable: true },
    time: { type: 'STRING', nullable: true },
    endDate: { type: 'STRING', nullable: true },
    venue: { type: 'STRING', nullable: true },
    city: { type: 'STRING', nullable: true },
    isOnline: { type: 'BOOLEAN' },
    priceType: { type: 'STRING', enum: ['free', 'paid', 'unknown'] },
    organizer: { type: 'STRING', nullable: true },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['isOnline', 'priceType', 'tags'],
}

export async function extractDraft(pasted: string): Promise<ExtractedDraft> {
  const today = DateTime.now().setZone(DEFAULT_TZ).toFormat('yyyy-MM-dd')
  const prompt = [
    'Extract ONE real-world event from the text below into JSON with exactly',
    'these keys: title, description (one factual sentence, max 200 chars),',
    'url (registration or info link found IN the text, else null), date',
    '(YYYY-MM-DD), time (HH:MM 24h, null if not stated), endDate (YYYY-MM-DD',
    'or null), venue, city, isOnline (boolean), priceType ("free"|"paid"|',
    `"unknown"), organizer, tags (up to 5 short topic words). Today is ${today}`,
    '(IST); a date with no year means the next future occurrence. Use null',
    'for anything the text does not state — NEVER invent a fact. If the text',
    'contains no event, return every nullable field as null.',
    '',
    '--- TEXT ---',
    pasted.slice(0, 6000),
  ].join('\n')

  const { data } = await complete<ExtractedDraft>(prompt, EXTRACT_SCHEMA)
  return {
    ...data,
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 5) : [],
    priceType: ['free', 'paid', 'unknown'].includes(data.priceType) ? data.priceType : 'unknown',
    isOnline: Boolean(data.isOnline),
  }
}

export interface ManualEventInput {
  title: string
  description: string | null
  url: string
  date: string | null
  time: string | null
  endDate: string | null
  venue: string | null
  city: string | null
  isOnline: boolean
  priceType: 'free' | 'paid' | 'unknown'
  organizer: string | null
  tags: string[]
}

/**
 * The `events` row for a confirmed hand-picked event. Mirrors ingest's
 * `toRow`, minus the geo classifier: pasting an event IS the geo decision.
 */
export function buildManualRow(input: ManualEventInput) {
  const local = input.date ? `${input.date}T${input.time ?? '00:00'}:00` : null
  const start = local ? DateTime.fromISO(local, { zone: DEFAULT_TZ }) : null
  const endLocal = input.endDate ? `${input.endDate}T${input.time ?? '00:00'}:00` : null
  const end = endLocal ? DateTime.fromISO(endLocal, { zone: DEFAULT_TZ }) : null
  if (start && !start.isValid) throw new Error(`invalid date: ${input.date} ${input.time}`)
  if (end && !end.isValid) throw new Error(`invalid end date: ${input.endDate}`)

  const contentHash = scoringHash({
    title: input.title,
    description: input.description,
    tags: input.tags,
    eventType: null,
  })

  return {
    source_id: 'manual',
    source_uid: crypto.randomUUID(),
    title: input.title,
    title_norm: normalizeTitle(input.title),
    description: input.description,
    url: input.url,
    canonical_url: canonicalizeUrl(input.url),
    image_url: null,
    organizer: input.organizer,
    organizer_norm: normalizeOrganizer(input.organizer),
    starts_at_local: start ? start.toFormat("yyyy-MM-dd'T'HH:mm:ss") : null,
    ends_at_local: end ? end.toFormat("yyyy-MM-dd'T'HH:mm:ss") : null,
    tz: DEFAULT_TZ,
    starts_at: start ? start.toUTC().toISO() : null,
    ends_at: end ? end.toUTC().toISO() : null,
    registration_deadline: null,
    date_precision: input.date ? (input.time ? 'instant' : 'day') : 'unknown',
    date_kind: input.date ? 'start' : 'tba',
    is_online: input.isOnline,
    city: input.city,
    area: inferArea(input.venue),
    venue: input.venue,
    event_type: null,
    tags: input.tags,
    price_type: input.priceType,
    price_amount: null,
    price_currency: null,
    content_hash: contentHash,
    status: 'active' as const,
    last_seen_at: new Date().toISOString(),
    relevance_score: 85,
    relevance_reason: 'Hand-picked',
    scoring_model: 'manual',
    profile_hash: PROFILE_HASH,
    scoring_version: SCORING_VERSION,
    scored_content_hash: contentHash,
  }
}
