import type { Member, Requirement } from "@/engine";
import type { ProfileWithSkills, RequirementRow } from "./types";

export function toMember(p: ProfileWithSkills): Member {
  return {
    id: p.id,
    name: p.name,
    experienceLevel: clampLevel(p.experience_level),
    commitmentLevel: clampLevel(p.commitment_level),
    availability: p.availability_windows ?? [],
    skills: p.skills.map((s) => ({
      skill: s.skill,
      proficiency: Number(s.proficiency),
      verified: s.proof_url != null,
    })),
  };
}

export function toRequirement(r: RequirementRow): Requirement {
  return {
    id: r.id,
    skill: r.skill,
    roleLabel: r.role_label ?? undefined,
    weight: Number(r.weight),
    minProficiency: Number(r.min_proficiency),
  };
}

function clampLevel(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}
