import { describe, expect, it } from 'vitest'
import { EMPTY_DRAFT } from './steps'
import {
  toAvailabilityWindows,
  toHandle,
  uniqueHandle,
  validateProfileDraft,
  type ProfileDraft,
} from './draft'

const draft = (over: Partial<ProfileDraft> = {}): ProfileDraft => ({
  ...EMPTY_DRAFT,
  name: 'Shaan Guru',
  skills: ['react'],
  ...over,
})

describe('toHandle', () => {
  it('lowercases and strips everything a URL would have to escape', () => {
    expect(toHandle('Shaan Guru')).toBe('shaanguru')
    expect(toHandle("O'Brien-Smith")).toBe('obriensmith')
  })

  it('folds accents rather than dropping the letter', () => {
    expect(toHandle('Renée')).toBe('renee')
  })

  it('is empty when there is nothing usable', () => {
    expect(toHandle('!!!')).toBe('')
  })
})

describe('uniqueHandle', () => {
  it('keeps the base when it is free', () => {
    expect(uniqueHandle('shaan', [])).toBe('shaan')
  })

  // Two people typing the same first name is the expected case at a demo,
  // not an edge one.
  it('suffixes past every taken handle', () => {
    expect(uniqueHandle('shaan', ['shaan'])).toBe('shaan2')
    expect(uniqueHandle('shaan', ['shaan', 'shaan2'])).toBe('shaan3')
  })

  it('falls back to a name when the base is empty', () => {
    expect(uniqueHandle('', [])).toBe('member')
  })
})

describe('validateProfileDraft', () => {
  it('accepts a filled draft and assigns a free handle', () => {
    const res = validateProfileDraft(draft(), [])
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.handle).toBe('shaanguru')
      expect(res.value.name).toBe('Shaan Guru')
    }
  })

  it('rejects a missing name and a skill-less draft', () => {
    const res = validateProfileDraft(draft({ name: '', skills: [] }), [])
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors.map((e) => e.field).sort()).toEqual(['name', 'skills'])
    }
  })

  // Punctuation passes a length check and then produces an empty handle,
  // which would route to /p/ and 404 the profile just created.
  it('rejects a name that survives length but produces no handle', () => {
    const res = validateProfileDraft(draft({ name: '!!!!' }), [])
    expect(res.ok).toBe(false)
  })

  it('collapses whitespace and dedupes skills', () => {
    const res = validateProfileDraft(
      draft({ name: '  Shaan   Guru ', skills: ['react', 'react'] }),
      [],
    )
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.name).toBe('Shaan Guru')
      expect(res.value.draft.skills).toEqual(['react'])
    }
  })

  it('clamps levels a hand-posted form could put out of range', () => {
    const res = validateProfileDraft(draft({ experienceLevel: 99, commitmentLevel: 0 }), [])
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.draft.experienceLevel).toBe(5)
      expect(res.value.draft.commitmentLevel).toBe(1)
    }
  })
})

describe('toAvailabilityWindows', () => {
  it('puts weekday time in the evening and weekend time in the morning', () => {
    const both = toAvailabilityWindows({ ...EMPTY_DRAFT, days: 'both' })
    expect(both).toHaveLength(7)
    expect(both.find((w) => w.day === 3)?.start).toBe('18:00')
    expect(both.find((w) => w.day === 6)?.start).toBe('09:00')
  })

  it('narrows to the days that were chosen', () => {
    expect(toAvailabilityWindows({ ...EMPTY_DRAFT, days: 'weekdays' })).toHaveLength(5)
    expect(toAvailabilityWindows({ ...EMPTY_DRAFT, days: 'weekends' })).toHaveLength(2)
  })

  // "24:00" is not a time the engine parses, and a rejected window scores
  // zero overlap -- so without the clamp the person claiming the most hours
  // would rank as though they had none.
  it('never emits an hour the engine cannot parse', () => {
    const [first] = toAvailabilityWindows({ ...EMPTY_DRAFT, days: 'weekdays', hoursPerWeek: 60 })
    expect(first.end).toBe('23:00')
    expect(Number(first.end.slice(0, 2))).toBeLessThan(24)
  })
})
