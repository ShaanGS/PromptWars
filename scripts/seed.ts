/**
 * Sync config/sources.ts into the `sources` table, and the interest profile
 * hash into `app_state`.
 *
 * Config lives in git and this pushes it outward. Running it resets any
 * runtime tweak back to what the repo says, which is the intended direction:
 * git owns the config, the DB is just where the running system reads it.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import { SOURCES } from '@/config/sources'
import { NORMALIZER_VERSION, PROFILE_HASH, SCORING_VERSION } from '@/config/interest-profile'
import { createServiceClient } from '@/lib/supabase'

/**
 * Retry transient failures.
 *
 * `TypeError: fetch failed` is what supabase-js surfaces for a connection that
 * never got off the ground -- DNS, a reset, a blip between the runner and the
 * API. It killed ingest three mornings running: the first upsert threw, the
 * workflow exited, and AllEvents and Luma went stale for a day each time even
 * though nothing was actually wrong.
 *
 * Retried rather than ignored. A real error (a bad key, a missing column)
 * fails all three attempts and still stops the run, which is what should
 * happen -- this only buys tolerance for the network being briefly unhappy.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 4000]
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const transient = /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(message)
      if (!transient || attempt >= delays.length) throw err
      console.warn(`  ${label}: ${message} -- retrying in ${delays[attempt]}ms`)
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }
}

async function main() {
  assertProdWritesAllowed('seed')
  const db = createServiceClient()

  for (const s of SOURCES) {
    // The error arrives as a returned value, not a thrown one, so the check
    // lives inside the retry -- otherwise a transient failure is indistinguish-
    // able from a real one and never gets a second attempt.
    await withRetry(`seeding source ${s.id}`, async () => {
      const { error } = await db.from('sources').upsert(
        {
          id: s.id,
          display_name: s.displayName,
          enabled: s.enabled,
          crawl_delay_ms: s.crawlDelayMs,
          user_agent: s.userAgent,
          default_audience: s.defaultAudience,
        },
        { onConflict: 'id' },
      )
      if (error) throw new Error(`seeding source ${s.id}: ${error.message}`)
    })
    console.log(`  ${s.enabled ? 'on ' : 'off'}  ${s.id.padEnd(18)} ${s.displayName}`)
  }

  const state = await withRetry('reading app_state', async () => {
    const { data, error } = await db.from('app_state').select('profile_hash').eq('id', 1).single()
    if (error) throw new Error(`reading app_state: ${error.message}`)
    return data
  })

  if (state?.profile_hash !== PROFILE_HASH) {
    console.log(`\nprofile hash changed (${state?.profile_hash || 'empty'} -> ${PROFILE_HASH}).`)
    console.log('Cached relevance scores will be recomputed on the next scoring run.')
  }

  await withRetry('updating app_state', async () => {
    const { error } = await db
      .from('app_state')
      .update({
        profile_hash: PROFILE_HASH,
        scoring_version: SCORING_VERSION,
        normalizer_version: NORMALIZER_VERSION,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    if (error) throw new Error(`updating app_state: ${error.message}`)
  })

  console.log(`\nseeded ${SOURCES.length} sources. profile hash ${PROFILE_HASH}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
