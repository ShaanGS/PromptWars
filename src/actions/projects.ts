"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { SKILL_VOCAB } from "@/lib/constants";
import { getMyProfile } from "@/repo/queries";
import { supabaseServer } from "@/repo/server";

const squadSchema = z.object({
  title: z.string().trim().min(3, "give the squad a title").max(80),
  description: z.string().trim().max(400).optional(),
  eventId: z.uuid().optional(),
  requirements: z
    .array(
      z.object({
        skill: z.enum(SKILL_VOCAB),
        roleLabel: z.string().trim().max(40).optional(),
        weight: z.number().int().min(1).max(3),
        minProficiency: z.number().min(0).max(1),
      }),
    )
    .min(1, "a squad needs at least one requirement")
    .max(6, "six requirements is the ceiling"),
});

export type SquadInput = z.input<typeof squadSchema>;

/**
 * Creates a squad request: project + its requirements + the owner's membership.
 * Requirements are the whole point — a project with no gaps has nothing for the
 * engine to score against, so the schema refuses one.
 *
 * No try/catch anywhere below: Supabase reports failures as `error` values, and
 * `redirect` signals success by throwing — wrapping it would swallow the
 * navigation.
 */
export async function createSquad(input: SquadInput): Promise<{ error: string } | never> {
  const parsed = squadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid input" };
  }
  const data = parsed.data;

  // Ownership is a profile, not a user: anonymous demo visitors have a session
  // but nothing to own a squad with.
  const profile = await getMyProfile();
  if (!profile) return { error: "Create your profile first" };

  const supabase = await supabaseServer();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      owner_profile_id: profile.id,
      community_id: null,
      event_id: data.eventId ?? null,
      title: data.title,
      description: data.description || null,
      is_seed: false,
    })
    .select("id")
    .single();
  if (projectError || !project) {
    return { error: projectError?.message ?? "could not create the squad" };
  }

  const { error: reqError } = await supabase.from("requirements").insert(
    data.requirements.map((r) => ({
      project_id: project.id,
      skill: r.skill,
      role_label: r.roleLabel || null,
      weight: r.weight,
      min_proficiency: r.minProficiency,
    })),
  );
  if (reqError) return { error: reqError.message };

  // Membership add is 'accepted' directly — no invite round-trip in v1, and the
  // owner is always on their own roster.
  const { error: memberError } = await supabase.from("memberships").insert({
    project_id: project.id,
    profile_id: profile.id,
    status: "accepted",
  });
  if (memberError) return { error: memberError.message };

  redirect(`/projects/${project.id}`);
}
