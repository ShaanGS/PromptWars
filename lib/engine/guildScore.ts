import type { GuildScore, Member, Requirement } from './types'
import { PROFICIENCY_FLOOR } from './types'
import { effectiveProficiency } from './coverage'

/**
 * Individual score: earned, not vanity. Credibility rewards proof links,
 * versatility rewards breadth, scarcity rewards skills the pool demands but
 * few people supply — your market value inside the community.
 */
export function guildScore(m: Member, pool: Member[], openReqs: Requirement[]): GuildScore {
  const total = m.skills.length
  const credibility = total === 0 ? 0 : m.skills.filter((s) => s.verified).length / total
  const versatility = Math.min(1, new Set(m.skills.map((s) => s.skill)).size / 8)

  const rareSkills: GuildScore['rareSkills'] = []
  let scarcitySum = 0
  for (const claim of m.skills) {
    const demand = openReqs.filter((r) => r.skill === claim.skill).length
    const supply = pool.filter((p) =>
      p.skills.some((s) => s.skill === claim.skill && effectiveProficiency(s) >= PROFICIENCY_FLOOR),
    ).length
    scarcitySum += demand === 0 ? 0 : demand / (demand + supply)
    if (demand > 0) rareSkills.push({ skill: claim.skill, demand, supply })
  }
  const scarcity = total === 0 ? 0 : scarcitySum / total
  rareSkills.sort(
    (a, b) =>
      b.demand / (b.demand + b.supply) - a.demand / (a.demand + a.supply) ||
      (a.skill < b.skill ? -1 : 1),
  )

  return {
    total: 0.4 * credibility + 0.25 * versatility + 0.35 * scarcity,
    credibility,
    versatility,
    scarcity,
    rareSkills: rareSkills.slice(0, 3),
  }
}
