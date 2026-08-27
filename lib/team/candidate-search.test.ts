import { describe, expect, it } from 'vitest'
import type { Member } from '@/lib/engine'
import { matchesMember } from './candidate-search'

const meera: Member = {
  id: 'p1',
  name: 'Meera Pillai',
  experienceLevel: 3,
  commitmentLevel: 4,
  availability: [],
  skills: [
    { skill: 'figma', proficiency: 0.85, verified: true },
    { skill: 'ui-ux', proficiency: 0.7, verified: false },
  ],
}

describe('matchesMember', () => {
  it('keeps everyone when the query is empty or blank', () => {
    expect(matchesMember(meera, '')).toBe(true)
    expect(matchesMember(meera, '   ')).toBe(true)
  })

  it('matches on name regardless of case', () => {
    expect(matchesMember(meera, 'meera')).toBe(true)
    expect(matchesMember(meera, 'PILLAI')).toBe(true)
  })

  it('matches on a partial skill', () => {
    expect(matchesMember(meera, 'fig')).toBe(true)
    expect(matchesMember(meera, 'ux')).toBe(true)
  })

  it('rejects a term that is in neither the name nor a skill', () => {
    expect(matchesMember(meera, 'backend')).toBe(false)
  })

  // The candidate list looks members up by id, and a rank referring to
  // somebody absent from the pool must drop out of a search rather than
  // survive it as an unrenderable row.
  it('drops a missing member unless the query is blank', () => {
    expect(matchesMember(undefined, 'meera')).toBe(false)
    expect(matchesMember(undefined, '')).toBe(true)
  })
})
