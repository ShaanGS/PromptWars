'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * Mute or unmute a source for the signed-in user. Per-user only: nothing
 * about the source itself changes, and their saved events from it stay.
 * The user comes from the verified session, never from the form.
 */
export async function setSourceMuted(sourceId: string, muted: boolean) {
  const user = await getSessionUser()
  if (!user) throw new Error('Not signed in')
  const id = sourceId.trim().slice(0, 40)
  if (!id) return
  const db = createServiceClient()
  if (muted) {
    await db
      .from('user_source_mutes')
      .upsert({ user_id: user.id, source_id: id }, { onConflict: 'user_id,source_id' })
  } else {
    await db.from('user_source_mutes').delete().eq('user_id', user.id).eq('source_id', id)
  }
  // Feed, All events, Calendar and this page all read the mute set.
  revalidatePath('/', 'layout')
}
