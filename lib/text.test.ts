import { describe, expect, it } from 'vitest'
import { displayTitle, snippet } from './text'

describe('snippet', () => {
  it('returns null for empty input', () => {
    expect(snippet(null)).toBeNull()
    expect(snippet('   ')).toBeNull()
  })

  it('returns short text unchanged (whitespace collapsed)', () => {
    expect(snippet('Hello   world\n\nagain')).toBe('Hello world again')
  })

  it('cuts at a sentence end when one falls in the back half', () => {
    const text =
      'First sentence here. Second sentence is longer than that. Third one goes past the budget.'
    expect(snippet(text, 60)).toBe('First sentence here. Second sentence is longer than that. …')
  })

  it('falls back to a word boundary and marks the cut', () => {
    const text = 'a'.repeat(20) + ' ' + 'b'.repeat(20) + ' ' + 'c'.repeat(20)
    const out = snippet(text, 50)!
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(51)
    expect(out).toBe('a'.repeat(20) + ' ' + 'b'.repeat(20) + '…')
  })

  it('never returns the full text when it is over budget', () => {
    const text = 'word '.repeat(100).trim()
    expect(snippet(text, 280)!.length).toBeLessThan(text.length)
  })
})

/** Real titles from the live feed, 2026-08-24 -- the "sloppy" screenshots. */
describe('displayTitle', () => {
  it('drops mode, date and time segments the meta line already states', () => {
    expect(displayTitle('Pitch to ivi | Virtual | August 24, 2026, | 10:00 AM - 05:00 PM')).toBe(
      'Pitch to ivi',
    )
  })

  it('drops lone city/mode segments but keeps real ones', () => {
    expect(displayTitle('Join Biggest Community | Investors & Founders | Chennai | Online')).toBe(
      'Join Biggest Community | Investors & Founders',
    )
  })

  it('keeps a title whose segments all carry meaning', () => {
    expect(displayTitle('AI Implementation in Business | Chennai')).toBe(
      'AI Implementation in Business',
    )
    expect(displayTitle('Right to INR | B2B Networking | Wealth & Investment Insights')).toBe(
      'Right to INR | B2B Networking | Wealth & Investment Insights',
    )
  })

  it('never drops the first segment', () => {
    expect(displayTitle('Chennai | Startup Mixer')).toBe('Chennai | Startup Mixer')
  })

  it('leaves un-piped titles alone', () => {
    expect(displayTitle('Figma: Fundamentals to UI Expertise 2026')).toBe(
      'Figma: Fundamentals to UI Expertise 2026',
    )
  })

  it('handles day-first date segments', () => {
    expect(displayTitle('DevFest | 24 Aug 2026 | Anna University')).toBe(
      'DevFest | Anna University',
    )
  })
})
