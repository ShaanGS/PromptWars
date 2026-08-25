'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase'
import { RELEVANCE_FLOOR } from '@/lib/queries'

export type EventState = 'interested' | 'registered' | 'going' | 'skipped' | 'attended'

/**
 * Every action resolves the user from the verified session, never from a
 * form field -- a client cannot act as someone else by editing a payload.
 * Writes go through the service role AFTER that check; RLS owner policies
 * exist on these tables as a second net, not the primary gate.
 */
async function requireUser() {
  const user = await getSessionUser()
  if (!user) throw new Error('Not signed in')
  return user
}

/** Record what you decided about an event. Null clears the choice. */
export async function setEventState(eventId: string, state: EventState | null) {
  const user = await requireUser()
  const db = createServiceClient()

  if (state === null) {
    await db.from('user_event_actions').delete().eq('user_id', user.id).eq('event_id', eventId)
  } else {
    await db.from('user_event_actions').upsert(
      {
        user_id: user.id,
        event_id: eventId,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,event_id' },
    )
  }

  // Feed, Saved, Calendar and the detail page all render this state;
  // invalidate everything under the root layout rather than enumerate them.
  revalidatePath('/', 'layout')
}

/**
 * Mark specific events seen for the signed-in user.
 *
 * Only ever fired by an explicit client action -- never during a GET render,
 * where a crawler or a <Link> prefetch would silently burn the badges.
 */
export async function markSeen(eventIds: string[]) {
  if (!eventIds.length) return
  const user = await requireUser()
  const db = createServiceClient()
  await db.from('user_event_seen').upsert(
    eventIds.slice(0, 500).map((event_id) => ({ user_id: user.id, event_id })),
    { onConflict: 'user_id,event_id', ignoreDuplicates: true },
  )
  revalidatePath('/', 'page')
}

/** The "Mark all seen" button: everything currently in the default feed. */
export async function markAllSeen() {
  const user = await requireUser()
  const db = createServiceClient()

  const { data: enabled } = await db.from('sources').select('id').eq('enabled', true)
  const sourceIds = (enabled ?? []).map((s) => s.id as string)
  if (!sourceIds.length) return

  const { data: rows } = await db
    .from('events')
    .select('id')
    .eq('status', 'active')
    .in('source_id', sourceIds)
    .gte('starts_at', new Date().toISOString())
    .or(`relevance_score.gte.${RELEVANCE_FLOOR},relevance_score.is.null`)
    .limit(1000)

  const ids = (rows ?? []).map((r) => r.id as string)
  if (!ids.length) return

  await db.from('user_event_seen').upsert(
    ids.map((event_id) => ({ user_id: user.id, event_id })),
    { onConflict: 'user_id,event_id', ignoreDuplicates: true },
  )
  revalidatePath('/', 'page')
}
