/**
 * Filter state lives in the URL.
 *
 * That keeps the back button honest, makes any view shareable, and means the
 * page stays a server component -- no client state to synchronise.
 */

export interface Filters {
  q: string
  /** Source id, or empty for all. */
  source: string
  when: 'all' | 'week' | 'month'
  offlineOnly: boolean
  freeOnly: boolean
  topOnly: boolean
  showLow: boolean
  /** Open the below-60 tier on the feed. Not a filter; never counted. */
  everything: boolean
  /** List order on /events. Empty = the page's default. Not counted. */
  sort: 'date' | 'rank' | ''
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  source: '',
  when: 'all',
  offlineOnly: false,
  freeOnly: false,
  topOnly: false,
  showLow: false,
  everything: false,
  sort: '',
}

type RawParams = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function parseFilters(params: RawParams): Filters {
  const when = one(params.when)
  return {
    q: one(params.q).trim().slice(0, 80),
    source: one(params.src).trim().slice(0, 30),
    when: when === 'week' || when === 'month' ? when : 'all',
    offlineOnly: one(params.offline) === '1',
    freeOnly: one(params.free) === '1',
    topOnly: one(params.top) === '1',
    showLow: one(params.low) === '1',
    everything: one(params.all) === '1',
    sort: one(params.sort) === 'date' ? 'date' : one(params.sort) === 'rank' ? 'rank' : '',
  }
}

/** 1-based page from `?page=`; anything odd is page 1. */
export function parsePage(params: RawParams): number {
  const n = Number.parseInt(one(params.page), 10)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 9999) : 1
}

/** The filters as query params. Page is deliberately absent: every change resets it. */
export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.source) p.set('src', f.source)
  if (f.when !== 'all') p.set('when', f.when)
  if (f.offlineOnly) p.set('offline', '1')
  if (f.freeOnly) p.set('free', '1')
  if (f.topOnly) p.set('top', '1')
  if (f.showLow) p.set('low', '1')
  if (f.everything) p.set('all', '1')
  if (f.sort) p.set('sort', f.sort)
  return p
}

function withBase(base: string, p: URLSearchParams): string {
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

/** Href for a page of the same filtered list. Page 1 is the clean URL. */
export function pageHref(current: Filters, page: number, base = '/events'): string {
  const p = serializeFilters(current)
  if (page > 1) p.set('page', String(page))
  return withBase(base, p)
}

/** Build a href with one key toggled, preserving everything else. */
export function toggleHref(
  current: Filters,
  key: keyof Filters,
  value?: string,
  base = '/',
): string {
  const p = serializeFilters(current)

  const map: Record<string, string> = {
    offlineOnly: 'offline',
    freeOnly: 'free',
    topOnly: 'top',
    showLow: 'low',
    everything: 'all',
  }

  if (key === 'source') {
    const next = value ?? ''
    if (!next || current.source === next) p.delete('src')
    else p.set('src', next)
  } else if (key === 'when') {
    const next = value ?? 'all'
    if (next === 'all' || current.when === next) p.delete('when')
    else p.set('when', next)
  } else if (key === 'sort') {
    if (!value || current.sort === value) p.delete('sort')
    else p.set('sort', value)
  } else if (key in map) {
    const param = map[key]
    if (p.get(param) === '1') p.delete(param)
    else p.set(param, '1')
  }

  return withBase(base, p)
}

export function activeCount(f: Filters): number {
  return (
    (f.q ? 1 : 0) +
    (f.source ? 1 : 0) +
    (f.when !== 'all' ? 1 : 0) +
    (f.offlineOnly ? 1 : 0) +
    (f.freeOnly ? 1 : 0) +
    (f.topOnly ? 1 : 0)
  )
}
