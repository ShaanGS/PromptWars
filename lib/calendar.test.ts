import { describe, expect, it } from 'vitest'
import {
  blockKind,
  calendarHref,
  daysIn,
  groupByDay,
  parseCalendarState,
  placementDay,
  rangeFor,
  rangeLabel,
  spanLabel,
  stepDate,
  timeLabel,
  todayIso,
} from './calendar'

describe('parseCalendarState', () => {
  it('defaults to week / today / mine', () => {
    const s = parseCalendarState({})
    expect(s.view).toBe('week')
    expect(s.scope).toBe('mine')
    expect(s.date).toBe(todayIso())
  })
  it('reads valid values and rejects junk', () => {
    expect(parseCalendarState({ view: 'month', date: '2026-08-24', scope: 'all' })).toEqual({
      view: 'month',
      date: '2026-08-24',
      scope: 'all',
    })
    const s = parseCalendarState({ view: 'year', date: 'not-a-date', scope: 'theirs' })
    expect(s.view).toBe('week')
    expect(s.scope).toBe('mine')
    expect(s.date).toBe(todayIso())
  })
})

describe('calendarHref', () => {
  it('omits defaults', () => {
    expect(calendarHref({ view: 'week', date: todayIso(), scope: 'mine' })).toBe('/calendar')
    expect(calendarHref({ view: 'month', date: '2026-09-01', scope: 'all' })).toBe(
      '/calendar?view=month&date=2026-09-01&scope=all',
    )
  })
})

describe('rangeFor', () => {
  it('week starts Monday and spans 7 days', () => {
    // 2026-08-26 is a Wednesday.
    const r = rangeFor('week', '2026-08-26')
    expect(r.start.toISODate()).toBe('2026-08-24')
    expect(r.end.toISODate()).toBe('2026-08-31')
    expect(daysIn(r)).toHaveLength(7)
  })
  it('month pads to whole weeks', () => {
    // August 2026 starts on a Saturday and ends on a Monday.
    const r = rangeFor('month', '2026-08-15')
    expect(r.start.toISODate()).toBe('2026-07-27')
    expect(r.end.toISODate()).toBe('2026-09-07')
    expect(daysIn(r).length % 7).toBe(0)
  })
  it('day is one day', () => {
    expect(daysIn(rangeFor('day', '2026-08-26'))).toEqual(['2026-08-26'])
  })
})

describe('stepDate / rangeLabel', () => {
  it('steps by the view unit', () => {
    expect(stepDate('day', '2026-08-31', 1)).toBe('2026-09-01')
    expect(stepDate('week', '2026-08-26', -1)).toBe('2026-08-19')
    expect(stepDate('month', '2026-01-31', 1)).toBe('2026-02-28')
  })
  it('labels', () => {
    expect(rangeLabel('day', '2026-08-26')).toBe('Wednesday 26 Aug')
    expect(rangeLabel('week', '2026-08-26')).toBe('24 – 30 Aug')
    expect(rangeLabel('week', '2026-09-02')).toBe('31 Aug – 6 Sep')
    expect(rangeLabel('month', '2026-08-26')).toBe('August 2026')
  })
})

describe('placement and grouping', () => {
  const timed = {
    starts_at_local: '2026-08-26T18:00:00',
    ends_at_local: null,
    date_precision: 'instant',
    date_kind: 'start',
  }
  const allday = {
    starts_at_local: '2026-08-26T00:00:00',
    ends_at_local: '2026-08-28T00:00:00',
    date_precision: 'day',
    date_kind: 'window',
  }
  const tba = {
    starts_at_local: null,
    ends_at_local: null,
    date_precision: 'unknown',
    date_kind: 'tba',
  }
  const monthOnly = {
    starts_at_local: '2026-09-01T00:00:00',
    ends_at_local: null,
    date_precision: 'month',
    date_kind: 'start',
  }

  it('places dated events, skips undated and month-only', () => {
    expect(placementDay(timed)).toBe('2026-08-26')
    expect(placementDay(tba)).toBeNull()
    expect(placementDay(monthOnly)).toBeNull()
  })
  it('groups with all-day first, then by time', () => {
    const g = groupByDay([timed, allday, tba])
    expect([...g.keys()]).toEqual(['2026-08-26'])
    expect(g.get('2026-08-26')).toEqual([allday, timed])
  })
  it('labels time and span', () => {
    expect(timeLabel(timed)).toBe('6:00 PM')
    expect(timeLabel(allday)).toBe('All day')
    expect(spanLabel(allday)).toBe('→ 28 Aug')
    expect(spanLabel(timed)).toBeNull()
  })
})

describe('blockKind', () => {
  it('maps states', () => {
    expect(blockKind('going')).toBe('going')
    expect(blockKind('registered')).toBe('going')
    expect(blockKind('interested')).toBe('saved')
    expect(blockKind('skipped')).toBe('other')
    expect(blockKind(null)).toBe('other')
  })
})

describe('isTimed', () => {
  it('treats a midnight instant as all-day', () => {
    expect(
      timeLabel({
        starts_at_local: '2026-08-25T00:00:00',
        ends_at_local: null,
        date_precision: 'instant',
        date_kind: 'start',
      }),
    ).toBe('All day')
    expect(
      timeLabel({
        starts_at_local: '2026-08-25T00:30:00',
        ends_at_local: null,
        date_precision: 'instant',
        date_kind: 'start',
      }),
    ).toBe('12:30 AM')
  })
})
