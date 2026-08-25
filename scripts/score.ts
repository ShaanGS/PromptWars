/**
 * Score unscored events for relevance.
 *
 *   npm run score
 *
 * Only touches rows whose cached score is stale: a different profile hash,
 * scoring version, model, or content hash. Everything else is skipped, which
 * is what keeps this inside a free tier.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import { createServiceClient } from '@/lib/supabase'
import { PROFILE_HASH, SCORING_VERSION } from '@/config/interest-profile'
import { SCORING_MODEL } from '@/lib/llm/provider'
import {
  applyModeAdjustment,
  keywordPass,
  llmScoreBatch,
  type ScoreInput,
} from '@/lib/pipeline/relevance'

const BATCH_SIZE = 12
/** Soft-fail rather than burning the day's quota in one run. */
const MAX_LLM_CALLS = 40

async function main() {
  assertProdWritesAllowed('score')
  const db = createServiceClient()

  const { data: rows, error } = await db
    .from('events')
    .select(
      'id, title, description, venue, is_online, event_type, tags, content_hash, scored_content_hash, relevance_score, profile_hash, scoring_version, scoring_model',
    )
    .eq('status', 'active')
    // Hand-picked events keep their hand-set 85: the human deciding an
    // event matters IS the relevance judgment; the model must not undo it.
    .neq('source_id', 'manual')
    .order('starts_at', { ascending: true })
    .limit(1000)
  if (error) throw new Error(`loading events: ${error.message}`)

  const stale = (rows ?? []).filter(
    (r) =>
      r.relevance_score === null ||
      r.profile_hash !== PROFILE_HASH ||
      r.scoring_version !== SCORING_VERSION ||
      r.scoring_model !== SCORING_MODEL ||
      // The event text itself changed since it was scored.
      r.scored_content_hash !== r.content_hash,
  )

  console.log(`${rows?.length ?? 0} active events, ${stale.length} need scoring`)
  if (!stale.length) return

  const hashById = new Map(stale.map((r) => [r.id as string, r.content_hash as string]))

  const inputs: ScoreInput[] = stale.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    venue: r.venue as string | null,
    isOnline: Boolean(r.is_online),
    eventType: r.event_type as string | null,
    tags: (r.tags as string[]) ?? [],
  }))

  const scored = new Map<string, { score: number; reason: string }>()
  const needsLlm: ScoreInput[] = []

  // Cheap pass first.
  for (const input of inputs) {
    const quick = keywordPass(input)
    if (quick) {
      scored.set(input.id, {
        score: applyModeAdjustment(quick.score, input.isOnline),
        reason: quick.reason,
      })
    } else {
      needsLlm.push(input)
    }
  }
  console.log(`keyword pass resolved ${scored.size}, ${needsLlm.length} go to the model`)

  let llmCalls = 0
  let model = SCORING_MODEL
  for (let i = 0; i < needsLlm.length; i += BATCH_SIZE) {
    if (llmCalls >= MAX_LLM_CALLS) {
      console.log(`hit the ${MAX_LLM_CALLS}-call cap; ${needsLlm.length - i} left for the next run`)
      break
    }
    const batch = needsLlm.slice(i, i + BATCH_SIZE)
    try {
      const result = await llmScoreBatch(batch)
      model = result.model
      for (const [id, s] of result.scores) {
        const input = batch.find((b) => b.id === id)
        scored.set(id, {
          score: applyModeAdjustment(s.score, input?.isOnline ?? false),
          reason: s.reason,
        })
      }
      llmCalls++
      process.stdout.write(`  batch ${llmCalls}: ${result.scores.size}/${batch.length}\r`)
    } catch (err) {
      console.error(`\nbatch failed: ${err instanceof Error ? err.message : err}`)
      break
    }
  }
  console.log(`\n${llmCalls} model calls`)

  const now = new Date().toISOString()
  let written = 0
  for (const [id, s] of scored) {
    const { error: updErr } = await db
      .from('events')
      .update({
        relevance_score: s.score,
        relevance_reason: s.reason,
        relevance_scored_at: now,
        profile_hash: PROFILE_HASH,
        scoring_version: SCORING_VERSION,
        scoring_model: model,
        scored_content_hash: hashById.get(id) ?? null,
      })
      .eq('id', id)
    if (!updErr) written++
  }

  console.log(`wrote ${written} scores`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
