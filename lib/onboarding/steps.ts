/**
 * The onboarding draft and its step rules.
 *
 * Pure and separate from the wizard component so the gating is testable
 * without rendering anything, and so the shape of what onboarding collects is
 * readable in one place.
 *
 * What it collects is not arbitrary: skills, availability, experience and
 * commitment are exactly the four member fields `lib/engine/` scores against
 * (see `Member` in lib/engine/types.ts). Onboarding asks for the model's
 * inputs and nothing else -- a question whose answer never reaches the
 * ranking would be a form pretending to be a product.
 */

export type OnboardingDraft = {
  /** `profiles.dept` is NOT NULL, and it is what every card prints under a
   *  name, so a blank one is both a failed insert and an empty card. */
  dept: string
  year: number
  skills: string[]
  days: 'weekdays' | 'weekends' | 'both'
  hoursPerWeek: number
  experienceLevel: number
  commitmentLevel: number
}

export const ONBOARDING_STEPS = ['skills', 'availability', 'experience'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const EMPTY_DRAFT: OnboardingDraft = {
  dept: '',
  year: 3,
  skills: [],
  days: 'both',
  hoursPerWeek: 10,
  experienceLevel: 3,
  commitmentLevel: 3,
}

/**
 * Only the skills step gates. Availability and experience both open on a
 * sensible default, and blocking someone on a slider they have already been
 * shown an answer to is friction with nothing behind it.
 */
export function canContinue(draft: OnboardingDraft, step: number): boolean {
  return ONBOARDING_STEPS[step] === 'skills' ? draft.skills.length > 0 : true
}

export function isLastStep(step: number): boolean {
  return step >= ONBOARDING_STEPS.length - 1
}

/** Clamps a step index to a real step, so a stale index cannot blank the UI. */
export function clampStep(step: number): number {
  if (!Number.isFinite(step) || step < 0) return 0
  return Math.min(Math.trunc(step), ONBOARDING_STEPS.length - 1)
}

export function toggleSkill(skills: string[], skill: string): string[] {
  return skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill]
}
