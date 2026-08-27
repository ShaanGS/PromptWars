import { describe, expect, it } from 'vitest'
import {
  canContinue,
  clampStep,
  EMPTY_DRAFT,
  isLastStep,
  ONBOARDING_STEPS,
  toggleSkill,
} from './steps'

describe('canContinue', () => {
  it('blocks the skills step until at least one skill is picked', () => {
    expect(canContinue(EMPTY_DRAFT, 0)).toBe(false)
    expect(canContinue({ ...EMPTY_DRAFT, skills: ['react'] }, 0)).toBe(true)
  })

  // Availability and experience open on defaults, so gating them would stop
  // someone on a question the form has already answered for them.
  it('never blocks the steps that open on a default', () => {
    expect(canContinue(EMPTY_DRAFT, 1)).toBe(true)
    expect(canContinue(EMPTY_DRAFT, 2)).toBe(true)
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
