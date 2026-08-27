import type { OnboardingDraft } from './steps'

/**
 * Turning what onboarding collected into a row the pool can rank.
 *
 * Pure, so the rules that decide whether a profile is publishable are
 * testable without a database — and so the browser can check them before the
 * server does, rather than the two drifting.
 */

export type ProfileDraft = OnboardingDraft & { name: string }

export type FieldError = { field: string; message: string }

export type Validated =
  | { ok: true; value: { name: string; handle: string; draft: OnboardingDraft } }
  | { ok: false; errors: FieldError[] }

export const NAME_MAX = 60

/**
 * A handle from a display name.
 *
 * Lowercase, ASCII letters and digits only. The engine matches skills by
 * exact string equality and the app routes on `/p/[handle]`, so anything that
 * would need escaping in a URL is dropped rather than encoded.
 */
export function toHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24)
}

/**
 * The first handle not already taken.
 *
 * Collisions are expected rather than exceptional: this is a demo people will
 * type their own first name into, twice, from two phones.
 */
export function uniqueHandle(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const root = base || 'member'
  if (!used.has(root)) return root
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}${n}`
    if (!used.has(candidate)) return candidate
  }
  return `${root}${Date.now()}`
}

export function validateProfileDraft(input: ProfileDraft, taken: Iterable<string>): Validated {
  const errors: FieldError[] = []

  const name = (input.name ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 2) errors.push({ field: 'name', message: 'Tell us what to call you.' })
  if (name.length > NAME_MAX) {
    errors.push({ field: 'name', message: `Keep it under ${NAME_MAX} characters.` })
  }

  const skills = [...new Set((input.skills ?? []).filter((s) => typeof s === 'string' && s))]
  if (skills.length === 0) {
    errors.push({ field: 'skills', message: 'Pick at least one skill so squads can rank you.' })
  }

  // A name of only punctuation passes the length check and then produces an
  // empty handle, which would route to /p/ and 404 the profile just created.
  const base = toHandle(name)
  if (name.length >= 2 && !base) {
    errors.push({ field: 'name', message: 'Use some letters or numbers.' })
  }

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      name,
      handle: uniqueHandle(base, taken),
      draft: {
        // Not blocking on it: the column needs a value, but stopping someone
        // on stage over their course name is friction for nothing.
        dept: (input.dept ?? '').trim().slice(0, 40) || 'Student',
        year: clampLevel(input.year, 1, 5),
        skills,
        days: input.days,
        hoursPerWeek: clampLevel(input.hoursPerWeek, 1, 60),
        experienceLevel: clampLevel(input.experienceLevel, 1, 5),
        commitmentLevel: clampLevel(input.commitmentLevel, 1, 5),
      },
    },
  }
}

/** The engine's levels are a 1-5 literal union; a form posts anything. */
function clampLevel(value: number, min: number, max: number): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

/**
 * The availability windows the engine scores, from the coarse answer the
 * wizard asks for. Evenings on weekdays and mornings at the weekend, because
 * those are the hours the seeded pool uses and overlap is only meaningful
 * against the same clock.
 */
export function toAvailabilityWindows(draft: OnboardingDraft) {
  const perDay = Math.min(Math.max(draft.hoursPerWeek / 5, 1), 6)
  // Clamped to 23:00 rather than allowed to roll over. "24:00" is not a time
  // the engine's parser accepts, and a window it rejects contributes zero
  // overlap -- so the person who claimed the MOST hours would have scored as
  // though they had none.
  const end = (start: number) =>
    `${String(Math.min(Math.round(start + perDay), 23)).padStart(2, '0')}:00`

  const weekdays = [1, 2, 3, 4, 5].map((day) => ({ day, start: '18:00', end: end(18) }))
  const weekend = [6, 0].map((day) => ({ day, start: '09:00', end: end(9) }))

  if (draft.days === 'weekdays') return weekdays
  if (draft.days === 'weekends') return weekend
  return [...weekdays, ...weekend]
}
