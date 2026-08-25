import type { AvailabilityWindow } from "@/engine";

export type SkillRow = {
  skill: string;
  proficiency: number;
  proof_url: string | null;
};

export type ProfileRow = {
  id: string;
  user_id: string | null;
  handle: string;
  name: string;
  dept: string;
  year: number | null;
  bio: string | null;
  experience_level: number;
  commitment_level: number;
  availability_windows: AvailabilityWindow[];
  is_seed: boolean;
};

export type ProfileWithSkills = ProfileRow & { skills: SkillRow[] };

export type EventRow = {
  id: string;
  source: "devfolio" | "devpost" | "unstop" | "organiser";
  external_url: string | null;
  title: string;
  host: string | null;
  mode: "online" | "in_person" | "hybrid" | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  deadline_at: string | null;
  tags: string[];
  posted_by_profile_id: string | null;
};

export type RequirementRow = {
  id: string;
  skill: string;
  role_label: string | null;
  weight: number;
  min_proficiency: number;
};

export type ProjectRow = {
  id: string;
  owner_profile_id: string;
  community_id: string | null;
  event_id: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  is_seed: boolean;
};

export type ProjectDetail = ProjectRow & {
  requirements: RequirementRow[];
  members: ProfileWithSkills[];
  event: EventRow | null;
};
