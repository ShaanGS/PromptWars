import { describe, expect, it } from 'vitest'
import { DEADLINE_SOURCE_IDS, FEED_OPT_IN_SOURCE_IDS, SOURCES } from '@/config/sources'
import { feedSourceIds, isDeadlineSource, selectSourceIds } from './sources'

const ENABLED = SOURCES.filter((s) => s.enabled).map((s) => s.id)

describe('source kinds', () => {
  it('classifies the two hackathon sources as deadline sources', () => {
    expect(isDeadlineSource('devpost')).toBe(true)
    expect(isDeadlineSource('unstop')).toBe(true)
    expect(isDeadlineSource('luma')).toBe(false)
    expect(isDeadlineSource('allevents')).toBe(false)
  })

  it('has both hackathon sources enabled, or the page is empty by construction', () => {
    for (const id of DEADLINE_SOURCE_IDS) expect(ENABLED).toContain(id)
  })
})

describe('selectSourceIds', () => {
  const enabled = ['allevents', 'luma', 'devpost', 'unstop']

  it('keeps deadline sources out of the default (dated) lists', () => {
    expect(selectSourceIds(enabled, [])).toEqual(['allevents', 'luma'])
  })

  it('returns only deadline sources for the hackathons list', () => {
    expect(selectSourceIds(enabled, [], 'deadlines')).toEqual(['devpost', 'unstop'])
  })

  it('returns everything for kind "all"', () => {
    expect(selectSourceIds(enabled, [], 'all')).toEqual(enabled)
  })

  it('applies mutes within the kind', () => {
    expect(selectSourceIds(enabled, ['unstop'], 'deadlines')).toEqual(['devpost'])
    expect(selectSourceIds(enabled, ['luma'])).toEqual(['allevents'])
  })

  it('a mute on a source of the other kind changes nothing', () => {
    expect(selectSourceIds(enabled, ['devpost'])).toEqual(['allevents', 'luma'])
  })

  it('can return nothing, which callers must turn into a sentinel', () => {
    expect(selectSourceIds(enabled, ['devpost', 'unstop'], 'deadlines')).toEqual([])
  })
})

describe('feedSourceIds', () => {
  // Mix of curated and opt-in ids, so the mechanism is tested rather than
  // any one source's current config.
  const visible = ['luma', 'gdg', 'knowafest', 'allevents']

  it('the noisy and high-volume sources are registered as feed-opt-in', () => {
    expect(FEED_OPT_IN_SOURCE_IDS).toContain('knowafest')
    expect(FEED_OPT_IN_SOURCE_IDS).toContain('allevents')
  })

  it('the curated sources are NOT opt-in -- they are what the feed is', () => {
    for (const id of ['luma', 'gdg', 'figma', 'mulesoft', 'manual']) {
      expect(FEED_OPT_IN_SOURCE_IDS).not.toContain(id)
    }
  })

  it('keeps every opt-in source out of the default feed', () => {
    expect(feedSourceIds(visible, '')).toEqual(['luma', 'gdg'])
  })

  it('admits the pool when an opt-in chip is active', () => {
    // Returns the whole pool; applyFilters then narrows to that one
    // source, so the chip shows its events and nothing else leaks in.
    expect(feedSourceIds(visible, 'knowafest')).toEqual(visible)
    expect(feedSourceIds(visible, 'allevents')).toEqual(visible)
  })

  it('a curated source as the active chip admits no opt-in source', () => {
    expect(feedSourceIds(visible, 'luma')).toEqual(['luma', 'gdg'])
  })
})
