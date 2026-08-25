import { createHash } from 'node:crypto'

/** JSON.stringify with sorted keys, so key order can't change the hash. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}

function omitDeep(value: unknown, keys: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((v) => omitDeep(v, keys))
  if (value === null || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (keys.has(k)) continue
    out[k] = omitDeep(v, keys)
  }
  return out
}

/**
 * Content hash over an explicit exclusion list.
 *
 * Hashing the whole payload looks harmless and is not: Devpost includes
 * `time_left_to_submission` ("7 days left") and `registrations_count`, both of
 * which change every day. That would insert a new raw row per hackathon per
 * day and, downstream, re-score the entire corpus daily -- turning a ~70
 * call/week budget into several hundred a day.
 */
export function contentHash(payload: unknown, volatileFields: string[] = []): string {
  const cleaned = volatileFields.length ? omitDeep(payload, new Set(volatileFields)) : payload
  return createHash('sha256').update(stableStringify(cleaned)).digest('hex').slice(0, 32)
}

/**
 * Hash of the fields that actually affect a relevance score. Deliberately
 * excludes url, venue and every timestamp: a venue correction upstream should
 * not cost an LLM call.
 */
export function scoringHash(input: {
  title: string
  description?: string | null
  tags?: string[]
  eventType?: string | null
}): string {
  return createHash('sha256')
    .update(
      stableStringify({
        title: input.title.trim().toLowerCase(),
        description: (input.description ?? '').trim().toLowerCase().slice(0, 2000),
        tags: [...(input.tags ?? [])].sort(),
        eventType: input.eventType ?? null,
      }),
    )
    .digest('hex')
    .slice(0, 32)
}
