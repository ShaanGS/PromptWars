import { createServiceClient } from '../supabase'
import { isDeadlineSource, selectSourceIds, type SourceKind } from '../sources'
import { mutedSourceIds, type SourceHealth } from './shared'

/**
 * Enabled sources as filter chips, display name included.
 *
 * Scoped by `kind` for the same reason the lists are: a Devpost chip on the
 * feed would filter a list Devpost has no rows in.
 */
export async function getSourceChips(
  userId: string,
  kind: SourceKind | 'all' = 'events',
): Promise<Array<{ id: string; label: string }>> {
  const db = createServiceClient()
  // Two reads, not three. visibleSourceIds() would re-select the same enabled
  // sources this query already returns, so the ids are derived from these rows
  // instead and only the mute list is fetched alongside.
  const [{ data }, muted] = await Promise.all([
    db.from('sources').select('id, display_name').eq('enabled', true).order('display_name'),
    mutedSourceIds(userId),
  ])
  const rows = (data ?? []).map((s) => ({ id: s.id as string, label: s.display_name as string }))
  const ids = new Set(
    selectSourceIds(
      rows.map((s) => s.id),
      muted,
      kind,
    ),
  )
  return rows.filter((s) => ids.has(s.id))
}

export interface SourceInfo extends SourceHealth {
  /** 'deadlines' sources feed /hackathons instead of the feed. */
  kind: 'events' | 'deadlines'
  muted: boolean
  lastRunAt: string | null
  lastListings: number | null
  lastError: string | null
}

/**
 * Everything the Sources page shows: health per source (the strip's RPC)
 * plus the latest scrape run and whether this user muted it.
 */
export async function listSources(userId: string): Promise<SourceInfo[]> {
  const db = createServiceClient()
  const [{ data: healthRows }, { data: runs }, muted] = await Promise.all([
    db.rpc('source_health'),
    db
      .from('scrape_runs')
      .select('source_id, started_at, finished_at, status, listings_found, error')
      .order('started_at', { ascending: false })
      .limit(200),
    mutedSourceIds(userId),
  ])
  const latest = new Map<string, Record<string, unknown>>()
  for (const r of (runs ?? []) as Record<string, unknown>[]) {
    const id = r.source_id as string
    if (!latest.has(id)) latest.set(id, r)
  }
  return ((healthRows ?? []) as Record<string, unknown>[]).map((r) => {
    const id = r.id as string
    const run = latest.get(id)
    return {
      id,
      display_name: r.display_name as string,
      enabled: Boolean(r.enabled),
      event_count: Number(r.event_count ?? 0),
      last_ok_at: (r.last_ok_at as string | null) ?? null,
      last_status: (r.last_status as string | null) ?? null,
      kind: isDeadlineSource(id) ? ('deadlines' as const) : ('events' as const),
      muted: muted.includes(id),
      lastRunAt: (run?.finished_at as string | null) ?? (run?.started_at as string | null) ?? null,
      lastListings: run ? Number(run.listings_found ?? 0) : null,
      lastError: (run?.error as string | null) ?? null,
    }
  })
}
