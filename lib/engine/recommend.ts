import type { MarginalGain, Member, Requirement } from "./types";
import { PROFICIENCY_FLOOR } from "./types";
import { effectiveProficiency } from "./coverage";
import { marginalGain } from "./marginal";

function ownedSkills(m: Member): Set<string> {
  return new Set(
    m.skills
      .filter((s) => effectiveProficiency(s) >= PROFICIENCY_FLOOR)
      .map((s) => s.skill),
  );
}

export type Complementarity = { score: number; aFills: string[]; bFills: string[] };

/**
 * The anti-LinkedIn recommendation: how much do two people COMPLETE each other?
 * aFills = skills a brings that b lacks; symmetric for bFills. Two clones of the
 * same stack score 0.
 */
export function complementarity(a: Member, b: Member): Complementarity {
  const aHas = ownedSkills(a);
  const bHas = ownedSkills(b);
  const aFills = [...aHas].filter((s) => !bHas.has(s)).sort();
  const bFills = [...bHas].filter((s) => !aHas.has(s)).sort();
  const union = new Set([...aHas, ...bHas]).size;
  return {
    score: union === 0 ? 0 : (aFills.length + bFills.length) / union,
    aFills,
    bFills,
  };
}

export function peopleYouShouldMeet(
  me: Member,
  pool: Member[],
  limit = 5,
): { member: Member; comp: Complementarity }[] {
  return pool
    .filter((p) => p.id !== me.id)
    .map((member) => ({ member, comp: complementarity(me, member) }))
    .sort((x, y) => y.comp.score - x.comp.score || (x.member.id < y.member.id ? -1 : 1))
    .slice(0, limit);
}

/**
 * The feed, flipped: open projects ranked by MY marginal gain to them.
 * The feed unit is a gap that matches you, not a post.
 */
export function gapFeed(
  me: Member,
  projects: { projectId: string; reqs: Requirement[]; team: Member[] }[],
): { projectId: string; gain: MarginalGain }[] {
  return projects
    .filter((p) => !p.team.some((m) => m.id === me.id))
    .map((p) => ({ projectId: p.projectId, gain: marginalGain(p.team, p.reqs, me) }))
    .filter((e) => e.gain.delta > 0)
    .sort((a, b) => b.gain.delta - a.gain.delta || (a.projectId < b.projectId ? -1 : 1));
}
