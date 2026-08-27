'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/server'
import { saveInterests } from '@/lib/interests'
import type { InterestPrefs } from '@/config/interest-tags'

/**
 * Olvable's feed interests. Moved here from /welcome when that route became
 * Guild's onboarding: these tags rank the event feed and reach the team
 * ranking nowhere, so keeping them next to the screen that edits them stops
 * the two being mistaken for one flow.
 */

export type InterestsResult = { ok: true } | { ok: false; message: string }

export async function updateInterests(input: {
  tags: string[]
  prefs: InterestPrefs
}): Promise<InterestsResult> {
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
