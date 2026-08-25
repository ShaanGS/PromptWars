import { createServiceClient } from '../supabase'
import type { EventRow } from './shared'

/**
 * The columns a non-member may see. EVENT_COLUMNS minus everything that is
 * ours rather than the event's: the relevance score and its reason, which
 * describe the member's taste, not the listing.
 */
const PUBLIC_COLUMNS =
  'id, source_id, title, description, url, image_url, organizer, starts_at_local, ends_at_local, ' +
  'starts_at, registration_deadline, date_precision, date_kind, is_online, city, area, ' +
  'venue, event_type, tags, price_type, price_amount, status'

export type PublicEvent = Omit<
  EventRow,
  | 'relevance_score'
  | 'relevance_reason'
  | 'seen_at'
  | 'action_state'
  | 'fit'
  | 'duplicate_count'
  | 'title_norm'
>

/**
 * One event for the public share page (/e/:id).
 *
 * Stricter than getEventById on purpose. A member link that worked
 * yesterday should keep working, so that query ignores status; a public
 * page is the opposite case -- we do not publish a filtered or archived row,
 * or anything from a source that is switched off, to the open web. Anything
 * that fails the test is a 404, not a banner.
 */
export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('events')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) return null
  const row = data as unknown as PublicEvent
  const { data: source } = await db
    .from('sources')
    .select('enabled')
    .eq('id', row.source_id)
    .maybeSingle()
  if (!source?.enabled) return null
  return row
}
