import { describe, expect, it } from 'vitest'
import { evaluateGates } from './quality'

const base = {
  parsed: [],
  droppedCount: 0,
  trailingCounts: [3],
  everReturnedRows: true,
  churnRatio: null,
}

describe('the zero-row gate', () => {
  it('a source that had rows and now has none is an error', () => {
    const r = evaluateGates(base)
    expect(r.pass).toBe(false)
    expect(r.status).toBe('error')
  })

  it('a sparse source at zero is a normal, successful run', () => {
    // GDG Chennai sat at zero upcoming the day the Bevy connector shipped,
    // with a past flagship proving the parser worked.
    const r = evaluateGates({ ...base, zeroIsNormal: true })
    expect(r.pass).toBe(true)
    expect(r.status).toBe('ok')
  })

  it('a sparse source with rows is gated like any other', () => {
    const r = evaluateGates({
      ...base,
      zeroIsNormal: true,
      parsed: [{ title: 'ab', url: 'https://x' } as never],
      trailingCounts: [1],
    })
    // One row with a 2-char title and no date fails titles and dates.
    expect(r.pass).toBe(false)
  })
})
