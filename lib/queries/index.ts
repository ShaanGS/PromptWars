import 'server-only'

/**
 * The one import path for reads: `@/lib/queries`, same exports as the
 * single-file era (split 4.4, 2026-08-24). Client components import types
 * from here too — type imports are erased at compile time, so the
 * `server-only` guard never reaches the browser bundle.
 *
 * Internal helpers (applyFilters, userStateFor, visibleSourceIds,
 * EVENT_COLUMNS) stay in ./shared and are deliberately not re-exported:
 * they were private before the split and staying private is what keeps
 * every read auditable from this file's surface.
 */
export {
  mutedSourceIds,
  PAGE_SIZE,
  RELEVANCE_FLOOR,
  type EventList,
  type EventRow,
  type SourceHealth,
} from './shared'
export { getDashboardData, type DashboardData } from './feed'
export { listEvents } from './events'
export { listHackathons } from './hackathons'
export { getSourceChips, listSources, type SourceInfo } from './sources'
export { getSavedEvents } from './saved'
export { getCalendarEvents } from './calendar'
export { getEventById, type EventDetail } from './detail'
export { getPublicEvent, type PublicEvent } from './public'
