import { describe, expect, it } from 'vitest'
import {
  canContinue,
  clampStep,
  EMPTY_DRAFT,
  isLastStep,
  ONBOARDING_STEPS,
  toggleSkill,
} from './steps'

const stepIndex = (name: (typeof ONBOARDING_STEPS)[number]) => ONBOARDING_STEPS.indexOf(name)

describe('canContinue', () => {
  it('blocks the about step until there is a name to route to', () => {
    expect(canContinue(EMPTY_DRAFT, stepIndex('about'))).toBe(false)
    expect(canContinue({ ...EMPTY_DRAFT, name: 'Shaan' }, stepIndex('about'))).toBe(true)
  })

  it('blocks the skills step until at least one skill is picked', () => {
    expect(canContinue(EMPTY_DRAFT, stepIndex('skills'))).toBe(false)
    expect(canContinue({ ...EMPTY_DRAFT, skills: ['react'] }, stepIndex('skills'))).toBe(true)
  })

  // Every other step opens on a default, so gating one would stop someone on
  // a control that already shows them an answer.
  it('never blocks the steps that open on a default', () => {
    for (const name of ['looking', 'availability', 'experience', 'review'] as const) {
      expect(canContinue(EMPTY_DRAFT, stepIndex(name))).toBe(true)
    }
  })
})

describe('isLastStep', () => {
  it('is true only on the final step', () => {
    expect(isLastStep(0)).toBe(false)
    expect(isLastStep(ONBOARDING_STEPS.length - 1)).toBe(true)
  })
})

describe('clampStep', () => {
  it('keeps a stale or malformed index inside the real steps', () => {
    expect(clampStep(-3)).toBe(0)
    expect(clampStep(99)).toBe(ONBOARDING_STEPS.length - 1)
    expect(clampStep(Number.NaN)).toBe(0)
    expect(clampStep(1)).toBe(1)
  })
})

describe('toggleSkill', () => {
  it('adds a skill that is absent and removes one that is present', () => {
    expect(toggleSkill([], 'figma')).toEqual(['figma'])
    expect(toggleSkill(['figma'], 'figma')).toEqual([])
  })

  it('leaves the other picks alone', () => {
    expect(toggleSkill(['figma', 'react'], 'react')).toEqual(['figma'])
  })
})
