import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, pageHref, parseFilters, parsePage, toggleHref } from './filters'

describe('toggleHref with a base path', () => {
  it('defaults to the feed and honours /events', () => {
    expect(toggleHref(DEFAULT_FILTERS, 'offlineOnly')).toBe('/?offline=1')
    expect(toggleHref(DEFAULT_FILTERS, 'offlineOnly', undefined, '/events')).toBe(
      '/events?offline=1',
    )
    expect(
      toggleHref({ ...DEFAULT_FILTERS, offlineOnly: true }, 'offlineOnly', undefined, '/events'),
    ).toBe('/events')
  })
  it('toggles sort and keeps other filters', () => {
    const f = { ...DEFAULT_FILTERS, q: 'ai', sort: 'rank' as const }
    expect(toggleHref(f, 'sort', 'rank', '/events')).toBe('/events?q=ai')
    expect(toggleHref(f, 'sort', '', '/events')).toBe('/events?q=ai')
    expect(toggleHref({ ...f, sort: '' }, 'sort', 'rank', '/events')).toBe('/events?q=ai&sort=rank')
  })
})

describe('pageHref / parsePage', () => {
  it('page 1 is the clean URL; filters come along; page resets on toggle', () => {
    const f = { ...DEFAULT_FILTERS, source: 'luma' }
    expect(pageHref(f, 1)).toBe('/events?src=luma')
    expect(pageHref(f, 3)).toBe('/events?src=luma&page=3')
    expect(toggleHref(f, 'topOnly', undefined, '/events')).not.toContain('page=')
  })
  it('parses pages defensively', () => {
    expect(parsePage({})).toBe(1)
    expect(parsePage({ page: '4' })).toBe(4)
    expect(parsePage({ page: '-2' })).toBe(1)
    expect(parsePage({ page: 'x' })).toBe(1)
  })
  it('parses sort', () => {
    expect(parseFilters({ sort: 'rank' }).sort).toBe('rank')
    expect(parseFilters({ sort: 'weird' }).sort).toBe('')
  })
})
