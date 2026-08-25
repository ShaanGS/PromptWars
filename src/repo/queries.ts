import type {
  EventRow,
  ProfileWithSkills,
  ProjectDetail,
  ProjectRow,
  RequirementRow,
} from "@/lib/types";
import { isStaticDemo, supabaseServer } from "./server";
import { staticRepo } from "./static";

const PROFILE_SELECT =
  "id, user_id, handle, name, dept, year, bio, experience_level, commitment_level, availability_windows, is_seed, skills(skill, proficiency, proof_url)";

export async function getPool(): Promise<ProfileWithSkills[]> {
  if (isStaticDemo()) return staticRepo.pool();
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT);
  if (error) throw error;
  return (data ?? []) as unknown as ProfileWithSkills[];
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  if (isStaticDemo()) return staticRepo.project(id);
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, requirements(id, skill, role_label, weight, min_proficiency),
       events(*),
       memberships(status, profiles(${PROFILE_SELECT}))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { requirements, events, memberships, ...project } = data as never as ProjectRow & {
    requirements: RequirementRow[];
    events: EventRow | null;
    memberships: { status: string; profiles: ProfileWithSkills }[];
  };
  return {
    ...project,
    requirements,
    event: events,
    members: memberships
      .filter((m) => m.status === "accepted")
      .map((m) => m.profiles),
  };
}

export async function listProjectDetails(): Promise<ProjectDetail[]> {
  if (isStaticDemo()) return staticRepo.projects();
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, requirements(id, skill, role_label, weight, min_proficiency),
       events(*),
       memberships(status, profiles(${PROFILE_SELECT}))`,
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { requirements, events, memberships, ...project } = row as never as ProjectRow & {
      requirements: RequirementRow[];
      events: EventRow | null;
      memberships: { status: string; profiles: ProfileWithSkills }[];
    };
    return {
      ...project,
      requirements,
      event: events,
      members: memberships
        .filter((m) => m.status === "accepted")
        .map((m) => m.profiles),
    };
  });
}

export async function listEvents(): Promise<EventRow[]> {
  if (isStaticDemo()) return staticRepo.events();
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("deadline_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  if (isStaticDemo()) return staticRepo.event(id);
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

export async function getProfileByHandle(
  handle: string,
): Promise<ProfileWithSkills | null> {
  if (isStaticDemo()) return staticRepo.profileByHandle(handle);
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("handle", handle)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProfileWithSkills | null;
}

/** The signed-in user's own profile, or null (anon demo users have none). */
export async function getMyProfile(): Promise<ProfileWithSkills | null> {
  if (isStaticDemo()) return null;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProfileWithSkills | null;
}
