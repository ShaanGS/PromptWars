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

/**
 * What someone is here for. The six values match the seed's own vocabulary
 * (seed/seed-demo.mjs), so a profile created on stage carries the same intent
 * label as the forty already in the pool rather than a private synonym.
 */
export const LOOKING_FOR = [
  'Hackathon Team',
  'Research Project',
  'Startup / Idea',
  'Side Project',
  'Collab & Learn',
  'Open to Anything',
] as const

export type LookingFor = (typeof LOOKING_FOR)[number]

export type OnboardingDraft = {
  name: string
  lookingFor: LookingFor
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

export const ONBOARDING_STEPS = [
  'about',
  'skills',
  'looking',
  'availability',
  'experience',
  'review',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const EMPTY_DRAFT: OnboardingDraft = {
  name: '',
  lookingFor: 'Hackathon Team',
  dept: '',
  year: 3,
  skills: [],
  days: 'both',
  hoursPerWeek: 10,
  experienceLevel: 3,
  commitmentLevel: 3,
}

/**
 * Only the two steps that produce something unrecoverable gate: a profile
 * needs a name to be routed to, and a person with no skills can never be
 * ranked above zero. Every other step opens on a sensible default, and
 * blocking someone on a control that already shows an answer is friction
 * with nothing behind it.
 */
export function canContinue(draft: OnboardingDraft, step: number): boolean {
  const name = ONBOARDING_STEPS[clampStep(step)]
  if (name === 'about') return draft.name.trim().length >= 2
  if (name === 'skills') return draft.skills.length > 0
  return true
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
