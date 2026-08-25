import { describe, expect, it } from 'vitest'
import {
  DESCRIPTION_MIN,
  MAX_REQUIREMENTS,
  labelFromSkill,
  normaliseSkill,
  validateSquadDraft,
  type SquadDraft,
} from './new-squad'

const REQ = { skill: 'react', roleLabel: 'Frontend', weight: '2', minProficiency: '0.4' }

function draft(over: Partial<SquadDraft> = {}): SquadDraft {
  return {
    title: 'CropGuard',
    description: 'A detection model on a phone camera for smallholder farms.',
    eventId: null,
    kind: 'hackathon',
    effort: '10-15 hrs/week',
    requirements: [{ ...REQ }],
    ...over,
  }
}

/** The errors a caller would show, as a field -> message lookup. */
function errorsOf(d: SquadDraft): Record<string, string> {
  const res = validateSquadDraft(d)
  if (res.ok) return {}
  return Object.fromEntries(res.errors.map((e) => [e.field, e.message]))
}

describe('normaliseSkill', () => {
  it('matches how the pool spells its skills', () => {
    expect(normaliseSkill('Machine Learning')).toBe('machine-learning')
    expect(normaliseSkill('  UI/UX  ')).toBe('uiux')
    expect(normaliseSkill('ui-ux')).toBe('ui-ux')
    expect(normaliseSkill('data_engineering')).toBe('data-engineering')
  })

  it('collapses stray punctuation and dashes rather than passing them through', () => {
    expect(normaliseSkill('--React!!--')).toBe('react')
    expect(normaliseSkill('c++')).toBe('c')
  })

  it('is empty for input with nothing usable in it', () => {
    expect(normaliseSkill('   ')).toBe('')
    expect(normaliseSkill('!!!')).toBe('')
  })
})

describe('labelFromSkill', () => {
  it('titles a kebab skill for a row left unlabelled', () => {
    expect(labelFromSkill('machine-learning')).toBe('Machine Learning')
    expect(labelFromSkill('react')).toBe('React')
  })
})

describe('validateSquadDraft', () => {
  it('accepts a filled-in request and normalises it', () => {
    const res = validateSquadDraft(
      draft({
        title: '  CropGuard   —  crop  disease ',
        requirements: [
          {
            skill: 'Machine Learning',
            roleLabel: ' ML  Engineer ',
            weight: '3',
            minProficiency: '0.5',
          },
        ],
      }),
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.title).toBe('CropGuard — crop disease')
    expect(res.value.requirements).toEqual([
      { skill: 'machine-learning', roleLabel: 'ML Engineer', weight: 3, minProficiency: 0.5 },
    ])
  })

  it('names a role after its skill when the label is left blank', () => {
    const res = validateSquadDraft(draft({ requirements: [{ ...REQ, roleLabel: '' }] }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.requirements[0].roleLabel).toBe('React')
  })

  it('rejects a request with no roles — the engine would have nothing to score', () => {
    expect(errorsOf(draft({ requirements: [] }))).toHaveProperty('requirements')
  })

  it('ignores rows the poster started and abandoned', () => {
    const res = validateSquadDraft(
      draft({
        requirements: [
          { ...REQ },
          { skill: '', roleLabel: '', weight: '2', minProficiency: '0.4' },
        ],
      }),
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.requirements).toHaveLength(1)
  })

  it('rejects a row given a label but no skill, which is not abandoned', () => {
    const errs = errorsOf(draft({ requirements: [{ ...REQ, skill: '' }] }))
    expect(errs).toHaveProperty('requirements.0.skill')
  })

  it('rejects two roles under the same name', () => {
    const errs = errorsOf(draft({ requirements: [{ ...REQ }, { ...REQ, skill: 'backend' }] }))
    expect(errs).toHaveProperty('requirements.1.roleLabel')
  })

  it('allows the same skill twice under different names — that is two seats', () => {
    const res = validateSquadDraft(
      draft({
        requirements: [
          { ...REQ, roleLabel: 'Frontend' },
          { ...REQ, roleLabel: 'Dashboard' },
        ],
      }),
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.requirements.map((r) => r.skill)).toEqual(['react', 'react'])
  })

  it('rejects a weight the engine would divide by, or be swamped by', () => {
    expect(errorsOf(draft({ requirements: [{ ...REQ, weight: '0' }] }))).toHaveProperty(
      'requirements.0.weight',
    )
    expect(errorsOf(draft({ requirements: [{ ...REQ, weight: '9' }] }))).toHaveProperty(
      'requirements.0.weight',
    )
    expect(errorsOf(draft({ requirements: [{ ...REQ, weight: 'lots' }] }))).toHaveProperty(
      'requirements.0.weight',
    )
  })

  it('rejects a floor outside 0..1, which no proficiency can clear', () => {
    expect(errorsOf(draft({ requirements: [{ ...REQ, minProficiency: '1.5' }] }))).toHaveProperty(
      'requirements.0.minProficiency',
    )
    expect(errorsOf(draft({ requirements: [{ ...REQ, minProficiency: '-0.1' }] }))).toHaveProperty(
      'requirements.0.minProficiency',
    )
  })

  it('rounds a floor to two places so it survives the CHECK constraint', () => {
    const res = validateSquadDraft(draft({ requirements: [{ ...REQ, minProficiency: 0.1 + 0.2 }] }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.requirements[0].minProficiency).toBe(0.3)
  })

  it('caps the number of roles', () => {
    const many = Array.from({ length: MAX_REQUIREMENTS + 1 }, (_, i) => ({
      ...REQ,
      roleLabel: `Role ${i}`,
    }))
    expect(errorsOf(draft({ requirements: many }))).toHaveProperty('requirements')
  })

  it('rejects a description too short to tell anyone anything', () => {
    expect(errorsOf(draft({ description: 'help' }))).toHaveProperty('description')
    expect(
      errorsOf(draft({ description: 'x'.repeat(DESCRIPTION_MIN) })).description,
    ).toBeUndefined()
  })

  it('rejects a title that is barely there, and one that runs on', () => {
    expect(errorsOf(draft({ title: 'ab' }))).toHaveProperty('title')
    expect(errorsOf(draft({ title: 'x'.repeat(200) }))).toHaveProperty('title')
  })

  it('rejects a kind or effort outside the vocabulary the board groups by', () => {
    expect(errorsOf(draft({ kind: 'whatever' }))).toHaveProperty('kind')
    expect(errorsOf(draft({ effort: 'sometimes' }))).toHaveProperty('effort')
  })

  it('treats an empty event as no event rather than a broken link', () => {
    const res = validateSquadDraft(draft({ eventId: '   ' }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.eventId).toBeNull()
  })
})
