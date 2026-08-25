import { createServiceClient } from '../supabase'
import { EVENT_COLUMNS, type EventRow } from './shared'

/** Everything the user has decided to act on, for the Saved view. */
export async function getSavedEvents(userId: string): Promise<EventRow[]> {
  const db = createServiceClient()

  const { data: actions } = await db
    .from('user_event_actions')
    .select('event_id, state')
    .eq('user_id', userId)
    .in('state', ['interested', 'registered', 'going', 'attended'])

  const ids = (actions ?? []).map((a) => a.event_id as string)
  if (!ids.length) return []
  const stateById = new Map((actions ?? []).map((a) => [a.event_id as string, a.state as string]))

  const { data: rows } = await db
    .from('events')
    .select(EVENT_COLUMNS)
    .in('id', ids)
    .order('starts_at', { ascending: true, nullsFirst: false })
    .returns<EventRow[]>()

  return (rows ?? []).map((e) => ({
    ...e,
    action_state: stateById.get(e.id) ?? null,
    // The Saved view is a list the user built by hand; badges are noise here.
    seen_at: e.seen_at ?? new Date().toISOString(),
  }))
}
