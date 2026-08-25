import type { Member, Requirement, Risk } from "./types";
import { DEAD_ZONE_MINUTES, UNMET_THRESHOLD } from "./types";
import { scoreTeam } from "./score";

/** The team X-ray: what breaks if one person leaves, when nobody can meet. */
export function teamRisks(team: Member[], reqs: Requirement[]): Risk[] {
  const risks: Risk[] = [];
  const ts = scoreTeam(team, reqs);

  for (const req of reqs) {
    const entry = ts.coverage.find((c) => c.requirementId === req.id)!;
    const label = req.roleLabel ?? req.skill;
    if (entry.coverage < UNMET_THRESHOLD) {
      risks.push({
        type: "unmet_requirement",
        requirementId: req.id,
        severity: req.weight >= 2 ? "high" : "medium",
        message: `${label} is an open gap — coverage ${(entry.coverage * 100).toFixed(0)}%`,
      });
    } else if (entry.contributors.length === 1) {
      risks.push({
        type: "bus_factor",
        requirementId: req.id,
        severity: "high",
        message: `${label} depends on one person — if they drop, the slot goes dark`,
      });
    }
  }

  if (team.length >= 2 && ts.overlapMinutes < DEAD_ZONE_MINUTES) {
    risks.push({
      type: "availability_dead_zone",
      severity: "high",
      message: `The whole team shares only ${Math.round(ts.overlapMinutes)} min/week`,
    });
  }

  if (team.length >= 2) {
    const levels = team.map((m) => m.commitmentLevel);
    const spread = Math.max(...levels) - Math.min(...levels);
    if (spread >= 3) {
      risks.push({
        type: "commitment_gap",
        severity: "medium",
        message: `Commitment ranges ${Math.min(...levels)}–${Math.max(...levels)} of 5 — expect friction`,
      });
    }
  }

  return risks;
}
