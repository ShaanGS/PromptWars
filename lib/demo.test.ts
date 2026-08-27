import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * getDemoProfile is the identity every Guild screen renders against, and it is
 * called from the root layout. Its whole contract is "never throws, returns
 * null instead" -- a rejection here is a 500 in front of a judge. These tests
 * are that contract, not the happy path.
 */

const db = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  // Typed so the "names its columns" assertion can read mock.calls[0][0].
  const select = vi.fn<(columns: string) => { eq: typeof eq }>(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const createServiceClient = vi.fn(() => ({ from }))
  return { maybeSingle, eq, select, from, createServiceClient }
})

vi.mock('@/lib/supabase', () => ({ createServiceClient: db.createServiceClient }))

/**
 * Identity follows a cookie now, so the module reaches for next/headers. The
 * default is "no cookie set", which is the seeded-identity path these tests
 * are about; the cookie path is asserted separately below.
 */
const jar = vi.hoisted(() => ({
  get: vi.fn<(name: string) => { value: string } | undefined>(() => undefined),
}))
vi.mock('next/headers', () => ({ cookies: async () => jar }))

const { DEMO_PROFILE_HANDLE, getDemoProfile } = await import('./demo')

const row = {
  id: 'p1',
  handle: DEMO_PROFILE_HANDLE,
  name: 'Aarav',
  dept: 'CSE',
  year: 3,
  bio: null,
  experience_level: 4,
  commitment_level: 4,
  availability_windows: [{ day: 2, start: '18:00', end: '21:00' }],
  skills: [{ skill: 'react', proficiency: 0.8, proof_url: 'https://github.com/aarav' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  jar.get.mockReturnValue(undefined)
  db.createServiceClient.mockReturnValue({ from: db.from })
  db.from.mockReturnValue({ select: db.select })
  db.select.mockReturnValue({ eq: db.eq })
  db.eq.mockReturnValue({ maybeSingle: db.maybeSingle })
})

describe('getDemoProfile — degrades to null, never throws', () => {
  it('returns null when the query reports an error', async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } })
    await expect(getDemoProfile()).resolves.toBeNull()
  })

  it('returns null when the database has no such row', async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(getDemoProfile()).resolves.toBeNull()
  })

  it('returns null when the query rejects rather than propagating the rejection', async () => {
    db.maybeSingle.mockRejectedValue(new Error('fetch failed'))
    await expect(getDemoProfile()).resolves.toBeNull()
  })

  it('returns null when the client cannot even be constructed', async () => {
    // Missing env vars make createServiceClient throw; the layout must survive.
    db.createServiceClient.mockImplementation(() => {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
    })
    await expect(getDemoProfile()).resolves.toBeNull()
  })
})

describe('getDemoProfile — the seeded row', () => {
  it('looks the profile up by the hard-coded demo handle', async () => {
    db.maybeSingle.mockResolvedValue({ data: row, error: null })
    await getDemoProfile()
    expect(db.from).toHaveBeenCalledWith('profiles')
    expect(db.eq).toHaveBeenCalledWith('handle', DEMO_PROFILE_HANDLE)
  })

  it('names the columns it needs instead of selecting everything', async () => {
    db.maybeSingle.mockResolvedValue({ data: row, error: null })
    await getDemoProfile()
    const columns = String(db.select.mock.calls.at(0)?.at(0) ?? '')
    expect(columns).not.toContain('*')
    expect(columns).toContain('skills(skill, proficiency, proof_url)')
  })

  it('passes a seeded profile through intact', async () => {
    db.maybeSingle.mockResolvedValue({ data: row, error: null })
    const profile = await getDemoProfile()
    expect(profile?.handle).toBe(DEMO_PROFILE_HANDLE)
    expect(profile?.skills).toEqual([
      { skill: 'react', proficiency: 0.8, proof_url: 'https://github.com/aarav' },
    ])
  })

  it('turns a skill-less profile into [] rather than null', async () => {
    // PostgREST returns null, not [], for an embedded relation with no rows,
    // and every caller maps over .skills.
    db.maybeSingle.mockResolvedValue({ data: { ...row, skills: null }, error: null })
    const profile = await getDemoProfile()
    expect(profile?.skills).toEqual([])
  })

  it('turns null availability_windows into []', async () => {
    db.maybeSingle.mockResolvedValue({ data: { ...row, availability_windows: null }, error: null })
    const profile = await getDemoProfile()
    expect(profile?.availability_windows).toEqual([])
  })
})

describe('getDemoProfile — whoever onboarding created on this device', () => {
  it('looks up the handle in the cookie instead of the seeded one', async () => {
    jar.get.mockReturnValue({ value: 'shaanguru' })
    db.maybeSingle.mockResolvedValue({ data: { ...row, handle: 'shaanguru' }, error: null })

    const me = await getDemoProfile()

    expect(db.eq).toHaveBeenCalledWith('handle', 'shaanguru')
    expect(me?.handle).toBe('shaanguru')
  })

  // A cookie outlives the row it names: reseeding drops created profiles.
  // Showing the seeded identity beats showing an empty shell.
  it('falls back to the seeded handle when the cookie names a row that is gone', async () => {
    jar.get.mockReturnValue({ value: 'ghost' })
    db.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: row, error: null })

    const me = await getDemoProfile()

    expect(db.eq).toHaveBeenNthCalledWith(1, 'handle', 'ghost')
    expect(db.eq).toHaveBeenNthCalledWith(2, 'handle', DEMO_PROFILE_HANDLE)
    expect(me?.handle).toBe(DEMO_PROFILE_HANDLE)
  })
})
