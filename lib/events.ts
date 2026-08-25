// Imported from the shared module, not the barrel: lib/queries/calendar.ts
// imports the helpers below, so going through the barrel would make this a
// circular edge. Type-only either way, but shared keeps the graph acyclic.
import type { EventRow } from '@/lib/queries/shared'

/**
 * When an event actually claims your attention.
 *
 * For a normal listing that is its start. For a deadline listing (Devpost,
 * Unstop) `starts_at` is when the submission window OPENED -- often weeks
 * ago -- so anything that sorts, splits or places events by start files a
 * hackathon closing on Friday under July. The cutoff is the moment that
 * matters, so that is what these return.
 *
 * `ends_at_local` is the local face of the same instant for both deadline
 * connectors: Devpost maps the window's end to it, Unstop maps `end_date`.
 */
export function isDeadlineEvent(e: Pick<EventRow, 'date_kind' | 'registration_deadline'>): boolean {
  return e.date_kind === 'deadline' && Boolean(e.registration_deadline)
}

/** The UTC instant to sort and split by. */
export function effectiveInstant(
  e: Pick<EventRow, 'date_kind' | 'registration_deadline' | 'starts_at'>,
): string | null {
  return isDeadlineEvent(e) ? e.registration_deadline : e.starts_at
}

/** The Asia/Kolkata wall-clock string to render and group by. */
export function effectiveLocal(
  e: Pick<EventRow, 'date_kind' | 'registration_deadline' | 'starts_at_local' | 'ends_at_local'>,
): string | null {
  return isDeadlineEvent(e) ? (e.ends_at_local ?? e.starts_at_local) : e.starts_at_local
}
