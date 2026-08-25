// The engine is pure: plain objects in, plain objects out, zero imports.
// It runs identically in the browser (sandbox recompute) and on the server.

export type AvailabilityWindow = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday
  start: string // "HH:MM" 24h
  end: string
}

export type SkillClaim = {
  skill: string
  proficiency: number // 0..1
  verified: boolean // a proof link exists
}

export type Member = {
  id: string
  name: string
  experienceLevel: 1 | 2 | 3 | 4 | 5
  commitmentLevel: 1 | 2 | 3 | 4 | 5
  availability: AvailabilityWindow[]
  skills: SkillClaim[]
}

export type Requirement = {
  id: string
  skill: string
  roleLabel?: string
  weight: number // > 0
  minProficiency: number // 0..1, hard gate on effective proficiency
}

export type CoverageEntry = {
  requirementId: string
  coverage: number // 1 - Π(1 - p_eff) over gated contributors
  contributors: { memberId: string; effective: number }[] // sorted desc, id asc on ties
}

export type TeamScore = {
  score: number
  base: number
  overlap: number
  balance: number
  commitment: number
  overlapMinutes: number // weekly minutes shared by ALL members
  coverage: CoverageEntry[]
}

export type MarginalGain = {
  candidateId: string
  delta: number // score(T ∪ c) - score(T)
  fills: string[] // requirement ids where coverage was < UNMET below and c contributes
  duplicates: { requirementId: string; alreadyCoveredBy: string[] }[]
}

export type Risk = {
  type: 'bus_factor' | 'unmet_requirement' | 'availability_dead_zone' | 'commitment_gap'
  requirementId?: string
  severity: 'high' | 'medium'
  message: string
}

export type GuildScore = {
  total: number
  credibility: number // verified claims / total claims
  versatility: number // distinct skills / 8, capped
  scarcity: number // mean over skills of demand / (demand + supply)
  rareSkills: { skill: string; demand: number; supply: number }[]
}

export const WEIGHTS = { base: 0.6, overlap: 0.15, balance: 0.15, commitment: 0.1 } as const
export const UNVERIFIED_DAMP = 0.6
export const OVERLAP_TARGET_MINUTES = 600 // 10 h/week of shared time scores 1.0
export const UNMET_THRESHOLD = 0.5 // below this a requirement counts as an open gap
export const DEAD_ZONE_MINUTES = 120
export const PROFICIENCY_FLOOR = 0.4 // "has the skill" cutoff for scarcity/complements
