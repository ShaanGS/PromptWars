import type { CoverageEntry, Member, Requirement, SkillClaim } from './types'
import { UNVERIFIED_DAMP } from './types'

export function effectiveProficiency(claim: SkillClaim): number {
  return claim.proficiency * (claim.verified ? 1 : UNVERIFIED_DAMP)
}

function claimFor(member: Member, skill: string): SkillClaim | undefined {
  return member.skills.find((s) => s.skill === skill)
}

/**
 * Probabilistic-OR coverage: 1 - Π(1 - p_eff). A duplicate skill moves coverage
 * 0.8 → 0.96, not 1.6 — diminishing returns falls out of the math.
 * Claims below the requirement's minProficiency (after damping) contribute nothing.
 */
export function requirementCoverage(req: Requirement, team: Member[]): CoverageEntry {
  const contributors = team
    .map((m) => {
      const claim = claimFor(m, req.skill)
      const effective = claim ? effectiveProficiency(claim) : 0
      return { memberId: m.id, effective }
    })
    .filter((c) => c.effective >= req.minProficiency && c.effective > 0)
    .sort((a, b) => b.effective - a.effective || (a.memberId < b.memberId ? -1 : 1))

  const coverage = 1 - contributors.reduce((p, c) => p * (1 - c.effective), 1)
  return { requirementId: req.id, coverage, contributors }
}
