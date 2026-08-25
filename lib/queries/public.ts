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
  // The source check is an inner join rather than a second query: it used to
  // be a follow-up read keyed on the row we had just fetched, which made the
  // share page two sequential round trips to answer one question. `!inner`
  // means a row from a switched-off source does not come back at all, so the
  // 404 is decided in Postgres.
  const { data, error } = await db
    .from('events')
    .select(`${PUBLIC_COLUMNS}, sources!inner(enabled)`)
    .eq('id', id)
    .eq('status', 'active')
    .eq('sources.enabled', true)
    .maybeSingle()
  if (error || !data) return null
  // The embed is a filter, not payload -- drop it so nothing about our source
  // table is serialised into a public page.
  const row = data as unknown as PublicEvent & { sources?: unknown }
  delete row.sources
  return row
}
