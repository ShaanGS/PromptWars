'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/server'
import { saveInterests } from '@/lib/interests'
import { createServiceClient } from '@/lib/supabase'
import type { InterestPrefs } from '@/config/interest-tags'

export type OnboardingResult = { ok: true } | { ok: false; message: string }

/**
 * Save everything from the wizard in one go, mark the user onboarded, and
 * send them to their feed. Seed taps are written as 'interested' so they
 * show up in Saved and on the calendar from minute one.
 */
export async function completeOnboarding(input: {
  tags: string[]
  prefs: InterestPrefs
  seedEventIds: string[]
}): Promise<OnboardingResult | void> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!Array.isArray(input.tags) || input.tags.length === 0) {
    return { ok: false, message: 'Pick at least one interest.' }
  }

  try {
    const seeds = (input.seedEventIds ?? []).slice(0, 12)
    await saveInterests(user.id, {
      tags: input.tags,
      prefs: input.prefs ?? {},
      seedEventIds: seeds,
      complete: true,
    })
    if (seeds.length) {
      const db = createServiceClient()
      await db.from('user_event_actions').upsert(
        seeds.map((event_id) => ({
          user_id: user.id,
          event_id,
          state: 'interested',
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,event_id' },
      )
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/** /interests: same save, no redirect, never un-completes. */
export async function updateInterests(input: {
  tags: string[]
  prefs: InterestPrefs
}): Promise<OnboardingResult> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!Array.isArray(input.tags) || input.tags.length === 0) {
    return { ok: false, message: 'Keep at least one interest.' }
  }
  try {
    await saveInterests(user.id, { tags: input.tags, prefs: input.prefs ?? {}, complete: true })
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not save.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}
