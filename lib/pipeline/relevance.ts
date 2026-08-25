import { INTEREST_PROFILE } from '@/config/interest-profile'
import { complete } from '@/lib/llm/provider'

/**
 * Relevance scoring, cheapest path first.
 *
 * Most listings never need a model. AllEvents' Chennai pages are dominated by
 * concerts, marathons and trade expos; a keyword pass kills those for free and
 * keeps the LLM budget for the genuinely ambiguous middle -- which is what
 * makes this viable on a free tier at all.
 */

export interface ScoreInput {
  id: string
  title: string
  description?: string | null
  venue?: string | null
  isOnline: boolean
  eventType?: string | null
  tags?: string[]
}

export interface Score {
  score: number
  reason: string
  /** Whether a model was consulted, for budget reporting. */
  viaLlm: boolean
}

/**
 * Offline outranks online, applied after scoring rather than inside the
 * prompt so the penalty is consistent and auditable rather than something the
 * model applies unevenly.
 */
// Raised from 15: at 15, webinar noise still crowded the list. An online
// event now needs to be genuinely strong to sit among Chennai rooms.
const ONLINE_PENALTY = 25

function haystack(e: ScoreInput): string {
  return [e.title, e.description, e.venue, e.eventType, ...(e.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** Returns a score when the answer is obvious, null when a model is needed. */
export function keywordPass(e: ScoreInput): Score | null {
  const text = haystack(e)

  const negatives = INTEREST_PROFILE.negativeKeywords.filter((k) => text.includes(k))
  if (negatives.length) {
    return { score: 2, reason: `Not your field (${negatives[0]})`, viaLlm: false }
  }

  const hits = INTEREST_PROFILE.strongKeywords.filter((k) =>
    new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text),
  )
  // Two or more independent signals is enough to be confident without a model.
  if (hits.length >= 2) {
    return {
      score: Math.min(92, 70 + hits.length * 4),
      reason: `Matches ${hits.slice(0, 2).join(', ')}`,
      viaLlm: false,
    }
  }

  return null
}

const BATCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scores: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'INTEGER' },
          score: { type: 'INTEGER' },
          reason: { type: 'STRING' },
        },
        required: ['index', 'score', 'reason'],
      },
    },
  },
  required: ['scores'],
}

interface BatchResponse {
  scores: Array<{ index: number; score: number; reason: string }>
}

function buildPrompt(batch: ScoreInput[]): string {
  const items = batch
    .map((e, i) => {
      // Truncated hard. Title plus a short description is ~300 tokens rather
      // than 1,500 of raw text, and the extra text adds no signal for this.
      const desc = (e.description ?? '').slice(0, 180)
      const where = e.isOnline ? 'Online' : (e.venue ?? 'Chennai')
      return `${i}. ${e.title} | ${where}${desc ? ` | ${desc}` : ''}`
    })
    .join('\n')

  return `You are ranking events for one specific person.

ABOUT THEM: ${INTEREST_PROFILE.about}

THEIR PRIORITY INTERESTS: ${INTEREST_PROFILE.priorityTopics.join(', ')}

Score each event 0-100 for how much it is worth THIS person's time.

Their taste: technical and sharp. Rooms with builders, operators and money in
them. They have no interest in general-public entertainment of any kind.

Anchors, use them strictly:
- 85-100: founders, investors or senior operators will be in the room. Startup
  pitch events, VC or accelerator events, serious tech or AI conferences,
  curated business networking, developer conferences with real technical depth.
- 60-84: strong professional relevance. Developer or product meetups, design
  and engineering talks, industry conferences, startup or business school events.
- 30-59: tangential but defensible. Student tech fests with real technical
  content, niche developer workshops outside their stack.
- 0-29: everything aimed at the general public rather than at professionals,
  AND generic commercial gatherings. Concerts, gigs, comedy, theatre, film,
  marathons and runs, cricket and sport, religious events, weddings, retail
  and lifestyle expos, food festivals, fitness classes, hobby workshops,
  parties -- and also trade shows, industry expos, career fairs and job
  fairs, however large, unless the room is specifically startup founders or
  software engineers. A packaging expo at the trade centre is a 10, not a 45.

Be harsh. If an event's primary purpose is entertainment or leisure rather than
professional advancement, it is 0-10 regardless of how large or well-known it
is. A famous musician playing Chennai is a 0. When genuinely unsure between two
bands, choose the lower one.

REASON: at most 10 words, plain and concrete. Say who is in the room or why it
does not fit. Never restate the title.

EVENTS:
${items}

Return one entry per event, using the index shown.`
}

export async function llmScoreBatch(
  batch: ScoreInput[],
): Promise<{ scores: Map<string, Score>; model: string }> {
  const { data, model } = await complete<BatchResponse>(buildPrompt(batch), BATCH_SCHEMA)

  const out = new Map<string, Score>()
  for (const row of data.scores ?? []) {
    const event = batch[row.index]
    if (!event) continue // A hallucinated index must not corrupt another row.
    const score = Math.max(0, Math.min(100, Math.round(row.score)))
    out.set(event.id, {
      score,
      // Enforced here as well as in the prompt -- a long reason breaks the
      // card layout on a phone.
      reason: (row.reason ?? '').split(/\s+/).slice(0, 12).join(' '),
      viaLlm: true,
    })
  }
  return { scores: out, model }
}

/** Applies the online penalty. Offline events are the point of this product. */
export function applyModeAdjustment(score: number, isOnline: boolean): number {
  if (!isOnline) return score
  return Math.max(0, score - ONLINE_PENALTY)
}
