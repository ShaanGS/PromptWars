import type { Member, Requirement, TeamScore } from './types'
import { rankCandidates } from './marginal'
import { scoreTeam } from './score'

export type DraftPick = { member: Member; gainAtPick: number; scoreAfter: number }

/**
 * Greedy team builder: repeatedly add the candidate with the highest marginal
 * gain. Deterministic (ties break by id asc inside rankCandidates), so the
 * demo replays identically every time.
 */
export function autoDraft(
  pool: Member[],
  reqs: Requirement[],
  opts: { start?: Member[]; maxSize?: number; minGain?: number } = {},
): { picks: DraftPick[]; final: TeamScore } {
  const maxSize = opts.maxSize ?? 6
  const minGain = opts.minGain ?? 0.005
  const team = [...(opts.start ?? [])]
  const picks: DraftPick[] = []

  while (team.length < maxSize) {
    const [best] = rankCandidates(team, reqs, pool)
    if (!best || best.delta < minGain) break
    const member = pool.find((m) => m.id === best.candidateId)!
    team.push(member)
    picks.push({ member, gainAtPick: best.delta, scoreAfter: scoreTeam(team, reqs).score })
  }

  return { picks, final: scoreTeam(team, reqs) }
}
