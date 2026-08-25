import { DEADLINE_SOURCE_IDS, FEED_OPT_IN_SOURCE_IDS } from '@/config/sources'

export type SourceKind = 'events' | 'deadlines'

/** Whether a source publishes entry deadlines rather than dated events. */
export function isDeadlineSource(id: string): boolean {
  return DEADLINE_SOURCE_IDS.includes(id)
}

/**
 * Which source ids a list should draw from.
 *
 * Pure and separate from the query so the rule can be tested: a list is
 * enabled sources, minus this user's mutes, restricted to one kind. The
 * kind split is what keeps a hundred national hackathons out of a Chennai
 * feed, so it is worth a test rather than a comment.
 */
export function selectSourceIds(
  enabled: string[],
  muted: string[],
  kind: SourceKind | 'all' = 'events',
): string[] {
  return enabled
    .filter((id) => !muted.includes(id))
    .filter((id) =>
      kind === 'all' ? true : kind === 'deadlines' ? isDeadlineSource(id) : !isDeadlineSource(id),
    )
}

/**
 * The feed's variant of the rule: opt-in sources (Knowafest's ~100 fests)
 * join only when their own chip is the active source filter. Everywhere else
 * -- All events, the calendar -- they are ordinary enabled sources; this is
 * about the feed's default view staying a shortlist, not about hiding.
 */
export function feedSourceIds(ids: string[], activeSource: string): string[] {
  if (FEED_OPT_IN_SOURCE_IDS.includes(activeSource)) return ids
  return ids.filter((id) => !FEED_OPT_IN_SOURCE_IDS.includes(id))
}
