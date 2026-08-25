import 'server-only'
import { createServiceClient } from './supabase'
import { INTEREST_BY_ID, type InterestPrefs } from '@/config/interest-tags'
import type { Interests } from './ranking'
import type { EventRow } from './queries'

/**
 * Read and write a user's interests. Service role after the session check,
 * same pattern as every other per-user table.
 */
export async function getInterests(
  userId: string,
): Promise<(Interests & { completed: boolean }) | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('user_interests')
    .select('tags, prefs, completed_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    tags: ((data.tags as string[]) ?? []).filter((t) => t in INTEREST_BY_ID),
    prefs: (data.prefs as InterestPrefs) ?? {},
    completed: !!data.completed_at,
  }
}

export async function saveInterests(
  userId: string,
  input: { tags: string[]; prefs: InterestPrefs; seedEventIds?: string[]; complete?: boolean },
): Promise<void> {
  const db = createServiceClient()
  const tags = [...new Set(input.tags)].filter((t) => t in INTEREST_BY_ID)
  const row: Record<string, unknown> = {
    user_id: userId,
    tags,
    prefs: input.prefs,
    updated_at: new Date().toISOString(),
  }
  if (input.seedEventIds) row.seed_event_ids = input.seedEventIds
  if (input.complete) row.completed_at = new Date().toISOString()
  const { error } = await db.from('user_interests').upsert(row, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)

  if (input.complete) {
    // Mirror to app_metadata so the middleware can gate without a query.
    // Merged by the auth server; true is all we ever write here.
    const { data: u } = await db.auth.admin.getUserById(userId)
    const { error: metaErr } = await db.auth.admin.updateUserById(userId, {
      app_metadata: { ...(u?.user?.app_metadata ?? {}), onboarded: true },
    })
    if (metaErr) throw new Error(metaErr.message)
  }
}

/**
 * Six events for onboarding step 3: high quality, with a banner, spread
 * across categories so the taps carry signal.
 */
export async function getSeedEvents(limit = 6): Promise<EventRow[]> {
  const db = createServiceClient()
  const { data } = await db
    .from('events')
    .select(
      'id, source_id, title, description, url, image_url, organizer, starts_at_local, ends_at_local, starts_at, registration_deadline, date_precision, date_kind, is_online, city, area, venue, event_type, tags, price_type, price_amount, relevance_score, relevance_reason, title_norm, status',
    )
    .eq('status', 'active')
    .gte('starts_at', new Date().toISOString())
    .not('image_url', 'is', null)
    .gte('relevance_score', 55)
    .order('relevance_score', { ascending: false })
    .limit(40)
  const rows = (data ?? []) as Array<Omit<EventRow, 'seen_at'>>

  // Spread: at most two per matched tag set, so six cards are not six
  // founder meetups.
  const picked: EventRow[] = []
  const seen = new Map<string, number>()
  for (const r of rows) {
    const hay = `${r.title} ${r.description ?? ''}`.toLowerCase()
    const key = Object.values(INTEREST_BY_ID).find((t) => t.match.test(hay))?.id ?? 'other'
    const n = seen.get(key) ?? 0
    if (n >= 2) continue
    seen.set(key, n + 1)
    picked.push({ ...r, seen_at: null })
    if (picked.length >= limit) break
  }
  return picked
}
