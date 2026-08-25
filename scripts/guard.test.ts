import { describe, expect, it } from 'vitest'
import { prodWritesAllowed } from './guard'

describe('prodWritesAllowed', () => {
  it('refuses a bare local environment', () => {
    expect(prodWritesAllowed({})).toBe(false)
  })

  it('refuses the .env.local default of "false"', () => {
    expect(prodWritesAllowed({ ALLOW_PROD_WRITES: 'false' })).toBe(false)
  })

  it('allows a deliberate local run', () => {
    expect(prodWritesAllowed({ ALLOW_PROD_WRITES: 'true' })).toBe(true)
    expect(prodWritesAllowed({ ALLOW_PROD_WRITES: '1' })).toBe(true)
  })

  it('always allows GitHub Actions, where ingestion is supposed to write', () => {
    expect(prodWritesAllowed({ GITHUB_ACTIONS: 'true' })).toBe(true)
    expect(prodWritesAllowed({ GITHUB_ACTIONS: 'true', ALLOW_PROD_WRITES: 'false' })).toBe(true)
  })

  it('does not treat other truthy-looking values as consent', () => {
    expect(prodWritesAllowed({ ALLOW_PROD_WRITES: 'yes' })).toBe(false)
    expect(prodWritesAllowed({ GITHUB_ACTIONS: '1' })).toBe(false)
  })
})
