import type { MarginalGain, Member, Requirement } from "./types";
import { UNMET_THRESHOLD } from "./types";
import { effectiveProficiency } from "./coverage";
import { scoreTeam } from "./score";

/**
 * The single number that drives every ranking and explanation:
 * marginal gain = score(team ∪ candidate) - score(team).
 * A requirement the candidate contributes to counts as "filled" when it was an
 * open gap (coverage < UNMET_THRESHOLD) and as a "duplicate" when others
 * already cover it.
 */
export function marginalGain(
  team: Member[],
  reqs: Requirement[],
  candidate: Member,
): MarginalGain {
  const before = scoreTeam(team, reqs);
  const after = scoreTeam([...team, candidate], reqs);

  const fills: string[] = [];
  const duplicates: MarginalGain["duplicates"] = [];
  for (const req of reqs) {
    const claim = candidate.skills.find((s) => s.skill === req.skill);
    const effective = claim ? effectiveProficiency(claim) : 0;
    if (effective < req.minProficiency || effective <= 0) continue;
    const entry = before.coverage.find((c) => c.requirementId === req.id);
    if (!entry || entry.coverage < UNMET_THRESHOLD) {
      fills.push(req.id);
    } else {
      duplicates.push({
        requirementId: req.id,
        alreadyCoveredBy: entry.contributors.map((c) => c.memberId),
      });
    }
  }

  return { candidateId: candidate.id, delta: after.score - before.score, fills, duplicates };
}

export function rankCandidates(
  team: Member[],
  reqs: Requirement[],
  pool: Member[],
): MarginalGain[] {
  const teamIds = new Set(team.map((m) => m.id));
  return pool
    .filter((c) => !teamIds.has(c.id))
    .map((c) => marginalGain(team, reqs, c))
    .sort((a, b) => b.delta - a.delta || (a.candidateId < b.candidateId ? -1 : 1));
}
