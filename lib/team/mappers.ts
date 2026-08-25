import type { AvailabilityWindow, Member, Requirement } from '@/lib/engine'

/**
 * DB rows -> engine values.
 *
 * The engine is deliberately import-free and knows nothing about Postgres, so
 * every shape difference is reconciled here: snake_case to camelCase, numeric
 * columns that PostgREST may hand back as strings, the jsonb availability blob,
 * and the one rule that carries product meaning -- a skill is *verified* when a
 * proof link exists, and unverified claims are damped by the engine.
 */

export type ProfileRow = {
  id: string
  handle: string
  name: string
  dept: string | null
  year: number | null
  bio: string | null
  experience_level: number
  commitment_level: number
  availability_windows: unknown
}

export type SkillRow = {
  profile_id: string
  skill: string
  proficiency: number | string
  proof_url: string | null
}

export type RequirementRow = {
  id: string
  project_id: string
  skill: string
  role_label: string | null
  weight: number | string
  min_proficiency: number | string
}

export const PROFILE_COLUMNS =
  'id, handle, name, dept, year, bio, experience_level, commitment_level, availability_windows'
export const SKILL_COLUMNS = 'profile_id, skill, proficiency, proof_url'
export const REQUIREMENT_COLUMNS = 'id, project_id, skill, role_label, weight, min_proficiency'

/** Numerics arrive as `number` over PostgREST but as `string` over some drivers. */
function num(value: number | string | null | undefined, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/** The engine's level fields are a 1..5 union; the CHECK constraint agrees, but
 *  a bad row must not crash a page, so clamp rather than trust. */
function level(value: number | string | null | undefined): 1 | 2 | 3 | 4 | 5 {
  const n = Math.round(num(value, 3))
  return Math.min(5, Math.max(1, n)) as 1 | 2 | 3 | 4 | 5
}

/** availability_windows is jsonb: validate defensively, drop anything malformed. */
export function toWindows(raw: unknown): AvailabilityWindow[] {
  if (!Array.isArray(raw)) return []
  const out: AvailabilityWindow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const w = item as { day?: unknown; start?: unknown; end?: unknown }
    const day = Math.round(num(w.day as number, -1))
    if (day < 0 || day > 6) continue
    if (typeof w.start !== 'string' || typeof w.end !== 'string') continue
    out.push({ day: day as AvailabilityWindow['day'], start: w.start, end: w.end })
  }
  return out
}

export function toSkillClaim(row: SkillRow): Member['skills'][number] {
  return {
    skill: row.skill,
    proficiency: num(row.proficiency),
    verified: row.proof_url !== null && row.proof_url !== '',
  }
}

export function toMember(profile: ProfileRow, skills: SkillRow[] = []): Member {
  return {
    id: profile.id,
    name: profile.name,
    experienceLevel: level(profile.experience_level),
    commitmentLevel: level(profile.commitment_level),
    availability: toWindows(profile.availability_windows),
    skills: skills.map(toSkillClaim),
  }
}

export function toRequirement(row: RequirementRow): Requirement {
  return {
    id: row.id,
    skill: row.skill,
    roleLabel: row.role_label ?? undefined,
    // weight > 0 is a DB constraint; the engine divides by the total, so a 0
    // slipping through would poison every score on the page.
    weight: Math.max(0.0001, num(row.weight, 1)),
    minProficiency: num(row.min_proficiency, 0),
  }
}

/** Group skill rows by profile once, so callers do not scan the table per member. */
export function groupSkills(rows: SkillRow[]): Map<string, SkillRow[]> {
  const byProfile = new Map<string, SkillRow[]>()
  for (const row of rows) {
    const list = byProfile.get(row.profile_id)
    if (list) list.push(row)
    else byProfile.set(row.profile_id, [row])
  }
  return byProfile
}
