import type { Member, Requirement, TeamScore } from './types'
import { UNMET_THRESHOLD } from './types'

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/** Human-readable score breakdown — every number in the UI can say why. */
export function explainScore(ts: TeamScore, reqs: Requirement[], team: Member[]): string[] {
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? id
  const lines: string[] = []

  for (const req of reqs) {
    const entry = ts.coverage.find((c) => c.requirementId === req.id)!
    const label = req.roleLabel ?? req.skill
    if (entry.contributors.length === 0) {
      lines.push(`${label}: open gap`)
    } else {
      const names = entry.contributors.map((c) => nameOf(c.memberId)).join(', ')
      const tag = entry.coverage < UNMET_THRESHOLD ? ' — still thin' : ''
      lines.push(`${label}: ${pct(entry.coverage)} via ${names}${tag}`)
    }
  }

  if (team.length > 1) {
    lines.push(`Shared time: ${Math.round(ts.overlapMinutes / 60)}h/week`)
    lines.push(`Experience balance ${pct(ts.balance)}, commitment match ${pct(ts.commitment)}`)
  }
  return lines
}
