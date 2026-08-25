import { describe, expect, it } from 'vitest'
import { requirementCoverage } from '@/lib/engine'
import {
  groupSkills,
  toMember,
  toRequirement,
  toSkillClaim,
  toWindows,
  type ProfileRow,
  type RequirementRow,
  type SkillRow,
} from './mappers'

/**
 * The engine is pure and fully tested; this file is the only place a Postgres
 * row becomes an engine value. Every defensive branch here is a decision about
 * what the demo does when the data is wrong, so each one is pinned.
 */

const profile = (over: Partial<ProfileRow> = {}): ProfileRow => ({
  id: 'p1',
  handle: 'aarav',
  name: 'Aarav',
  dept: 'CSE',
  year: 3,
  bio: null,
  experience_level: 3,
  commitment_level: 3,
  availability_windows: [],
  ...over,
})

const skillRow = (over: Partial<SkillRow> = {}): SkillRow => ({
  profile_id: 'p1',
  skill: 'react',
  proficiency: 0.8,
  proof_url: null,
  ...over,
})

const reqRow = (over: Partial<RequirementRow> = {}): RequirementRow => ({
  id: 'r1',
  project_id: 'proj1',
  skill: 'react',
  role_label: null,
  weight: 1,
  min_proficiency: 0,
  ...over,
})

describe('toSkillClaim — proof links are what "verified" means', () => {
  it('marks a claim verified when a proof link exists', () => {
    expect(toSkillClaim(skillRow({ proof_url: 'https://github.com/aarav/x' })).verified).toBe(true)
  })

  it('marks a claim unverified when proof_url is null', () => {
    expect(toSkillClaim(skillRow({ proof_url: null })).verified).toBe(false)
  })

  it('treats an empty proof_url as no proof, not as a link', () => {
    // An empty string is truthy-adjacent enough to slip through a naive check.
    expect(toSkillClaim(skillRow({ proof_url: '' })).verified).toBe(false)
  })

  it('carries the unverified damp all the way into engine coverage', () => {
    // The whole point of the mapper: a proof-less 0.8 must reach the engine as
    // 0.8 unverified, so coverage lands on 0.48 rather than 0.8.
    const member = toMember(profile(), [skillRow({ proficiency: 0.8, proof_url: null })])
    const entry = requirementCoverage({ id: 'r1', skill: 'react', weight: 1, minProficiency: 0 }, [
      member,
    ])
    expect(entry.coverage).toBeCloseTo(0.48, 10)
  })
})

describe('numeric coercion — PostgREST hands numerics back as strings', () => {
  it('coerces a string proficiency to a number', () => {
    const claim = toSkillClaim(skillRow({ proficiency: '0.75' }))
    expect(claim.proficiency).toBe(0.75)
    expect(typeof claim.proficiency).toBe('number')
  })

  it('coerces string weight and min_proficiency', () => {
    const req = toRequirement(reqRow({ weight: '2.5', min_proficiency: '0.4' }))
    expect(req.weight).toBe(2.5)
    expect(req.minProficiency).toBe(0.4)
  })

  it('falls back rather than letting NaN reach the engine', () => {
    // A NaN weight would make every score on the page NaN.
    const req = toRequirement(reqRow({ weight: 'not-a-number', min_proficiency: 'nope' }))
    expect(req.weight).toBe(1)
    expect(req.minProficiency).toBe(0)
    expect(toSkillClaim(skillRow({ proficiency: 'oops' })).proficiency).toBe(0)
  })
})

describe('level() — experience and commitment clamp into 1..5', () => {
  it('clamps above the union', () => {
    expect(toMember(profile({ experience_level: 7 })).experienceLevel).toBe(5)
    expect(toMember(profile({ commitment_level: 99 })).commitmentLevel).toBe(5)
  })

  it('clamps below the union', () => {
    expect(toMember(profile({ experience_level: 0 })).experienceLevel).toBe(1)
    expect(toMember(profile({ commitment_level: -4 })).commitmentLevel).toBe(1)
  })

  it('clamps a numeric string the same way', () => {
    expect(toMember(profile({ experience_level: '7' as unknown as number })).experienceLevel).toBe(
      5,
    )
    expect(toMember(profile({ experience_level: '2' as unknown as number })).experienceLevel).toBe(
      2,
    )
  })

  it('rounds fractional levels to the nearest step', () => {
    expect(toMember(profile({ experience_level: 4.6 })).experienceLevel).toBe(5)
    expect(toMember(profile({ experience_level: 2.4 })).experienceLevel).toBe(2)
  })

  it('defaults a missing level to the middle of the range', () => {
    expect(toMember(profile({ experience_level: null as unknown as number })).experienceLevel).toBe(
      3,
    )
  })
})

describe('toWindows — availability_windows is untrusted jsonb', () => {
  it('returns [] when the column is missing or null', () => {
    expect(toWindows(null)).toEqual([])
    expect(toWindows(undefined)).toEqual([])
    expect(toMember(profile({ availability_windows: null })).availability).toEqual([])
  })

  it('returns [] when the column is not an array', () => {
    expect(toWindows({ day: 2, start: '18:00', end: '21:00' })).toEqual([])
    expect(toWindows('18:00')).toEqual([])
  })

  it('keeps a well-formed window, including Sunday (day 0)', () => {
    expect(toWindows([{ day: 0, start: '09:00', end: '12:00' }])).toEqual([
      { day: 0, start: '09:00', end: '12:00' },
    ])
  })

  it('drops out-of-range days rather than passing them to the engine', () => {
    expect(toWindows([{ day: 7, start: '18:00', end: '21:00' }])).toEqual([])
    expect(toWindows([{ day: -1, start: '18:00', end: '21:00' }])).toEqual([])
  })

  it('drops windows whose times are not strings', () => {
    expect(toWindows([{ day: 2, start: 1800, end: '21:00' }])).toEqual([])
    expect(toWindows([{ day: 2, start: '18:00', end: null }])).toEqual([])
  })

  it('drops junk entries but keeps the good ones alongside them', () => {
    expect(
      toWindows([
        null,
        'tuesday evening',
        { day: 9, start: '18:00', end: '21:00' },
        { day: 4, start: '18:00', end: '21:00' },
      ]),
    ).toEqual([{ day: 4, start: '18:00', end: '21:00' }])
  })
})

describe('toRequirement', () => {
  it('clamps a zero weight off zero so it cannot poison the score', () => {
    // scoreTeam divides by the total weight; a genuine 0 would zero the divisor
    // for a single-requirement project.
    expect(toRequirement(reqRow({ weight: 0 })).weight).toBe(0.0001)
    expect(toRequirement(reqRow({ weight: -5 })).weight).toBe(0.0001)
  })

  it('prefers the role label but falls back to the raw skill', () => {
    expect(toRequirement(reqRow({ role_label: 'Designer' })).roleLabel).toBe('Designer')
    expect(toRequirement(reqRow({ role_label: null })).roleLabel).toBeUndefined()
  })
})

describe('toMember / groupSkills', () => {
  it('gives a member with no skill rows an empty skills array', () => {
    expect(toMember(profile()).skills).toEqual([])
  })

  it('buckets skill rows by profile in one pass', () => {
    const grouped = groupSkills([
      skillRow({ profile_id: 'p1', skill: 'react' }),
      skillRow({ profile_id: 'p2', skill: 'figma' }),
      skillRow({ profile_id: 'p1', skill: 'ml' }),
    ])
    expect(grouped.get('p1')?.map((r) => r.skill)).toEqual(['react', 'ml'])
    expect(grouped.get('p2')?.map((r) => r.skill)).toEqual(['figma'])
    expect(grouped.get('nobody')).toBeUndefined()
  })

  it('maps a full row into the shape the engine consumes', () => {
    const member = toMember(
      profile({
        id: 'p9',
        name: 'Ira',
        availability_windows: [{ day: 2, start: '18:00', end: '21:00' }],
      }),
      [skillRow({ profile_id: 'p9', skill: 'figma', proficiency: '0.9', proof_url: 'https://x' })],
    )
    expect(member).toEqual({
      id: 'p9',
      name: 'Ira',
      experienceLevel: 3,
      commitmentLevel: 3,
      availability: [{ day: 2, start: '18:00', end: '21:00' }],
      skills: [{ skill: 'figma', proficiency: 0.9, verified: true }],
    })
  })
})
