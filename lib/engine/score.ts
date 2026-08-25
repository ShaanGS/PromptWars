import type { Member, Requirement, TeamScore } from "./types";
import { OVERLAP_TARGET_MINUTES, WEIGHTS } from "./types";
import { requirementCoverage } from "./coverage";
import { sharedMinutesPerWeek } from "./availability";

function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

export function scoreTeam(team: Member[], reqs: Requirement[]): TeamScore {
  const coverage = reqs.map((r) => requirementCoverage(r, team));
  const totalWeight = reqs.reduce((s, r) => s + r.weight, 0);
  const base =
    totalWeight === 0
      ? 0
      : reqs.reduce((s, r, i) => s + r.weight * coverage[i].coverage, 0) / totalWeight;

  // Solo or empty teams carry no coordination cost — the penalties only make
  // sense between people.
  const solo = team.length <= 1;
  const overlapMinutes = solo ? 0 : sharedMinutesPerWeek(team);
  const overlap = solo ? 1 : Math.min(1, overlapMinutes / OVERLAP_TARGET_MINUTES);
  const balance = solo ? 1 : 1 - variance(team.map((m) => m.experienceLevel)) / 4;
  const levels = team.map((m) => m.commitmentLevel);
  const commitment = solo ? 1 : 1 - (Math.max(...levels) - Math.min(...levels)) / 4;

  const score =
    WEIGHTS.base * base +
    WEIGHTS.overlap * overlap +
    WEIGHTS.balance * balance +
    WEIGHTS.commitment * commitment;

  return { score, base, overlap, balance, commitment, overlapMinutes, coverage };
}
