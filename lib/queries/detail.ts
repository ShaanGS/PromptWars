import { createServiceClient } from '../supabase'
import { EVENT_COLUMNS, type EventRow } from './shared'

export interface EventDetail {
  event: EventRow
  /** The other listings this card stands for, so the count on the card is
   *  something you can actually inspect rather than a claim. */
  alsoListedOn: Pick<EventRow, 'id' | 'source_id' | 'url'>[]
}

/**
 * One event, for the detail page.
 *
 * Deliberately not filtered by status or the relevance floor: a link that
 * worked yesterday should not 404 because the event dropped below the floor
 * or got archived. The page says so instead.
 */
export async function getEventById(userId: string, id: string): Promise<EventDetail | null> {
  const db = createServiceClient()

  const { data: row } = await db
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle<EventRow>()

  if (!row) return null

  const day = row.starts_at_local?.slice(0, 10) ?? row.starts_at?.slice(0, 10) ?? null

  const [{ data: action }, { data: seen }, { data: dupes }] = await Promise.all([
    db
      .from('user_event_actions')
      .select('state')
      .eq('user_id', userId)
      .eq('event_id', id)
      .maybeSingle(),
    db
      .from('user_event_seen')
      .select('seen_at')
      .eq('user_id', userId)
      .eq('event_id', id)
      .maybeSingle(),
    row.title_norm && day
      ? db
          .from('events')
          .select('id, source_id, url, starts_at_local, starts_at')
          .eq('title_norm', row.title_norm)
          .eq('status', 'active')
          .neq('id', id)
      : Promise.resolve({ data: [] }),
  ])

  // Same-day check happens here rather than in SQL: the grouping key on the
  // dashboard is title + calendar day, and dates live in two columns.
  const alsoListedOn = ((dupes ?? []) as Record<string, unknown>[])
    .filter((d) => {
      const other =
        (d.starts_at_local as string | null)?.slice(0, 10) ??
        (d.starts_at as string | null)?.slice(0, 10) ??
        null
      return other === day
    })
    .map((d) => ({
      id: d.id as string,
      source_id: d.source_id as string,
      url: d.url as string,
    }))

  return {
    event: {
      ...row,
      action_state: (action?.state as string | null) ?? null,
      seen_at: (seen?.seen_at as string | null) ?? null,
    },
    alsoListedOn,
  }
}
