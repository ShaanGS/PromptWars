"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/repo/server";
import { DEPTS, SKILL_VOCAB } from "@/lib/constants";

const windowSchema = z.object({
  day: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,24}$/, "handle: 3-24 chars, a-z 0-9 -"),
  dept: z.enum(DEPTS),
  year: z.number().int().min(1).max(5),
  bio: z.string().trim().max(200).optional(),
  experienceLevel: z.number().int().min(1).max(5),
  commitmentLevel: z.number().int().min(1).max(5),
  availability: z.array(windowSchema).max(21),
  skills: z
    .array(
      z.object({
        skill: z.enum(SKILL_VOCAB),
        proficiency: z.number().min(0.1).max(1),
        proofUrl: z.string().trim().url().optional().or(z.literal("")),
      }),
    )
    .min(1, "claim at least one skill")
    .max(6),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function saveProfile(input: ProfileInput): Promise<{ error: string } | never> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid input" };
  }
  const data = parsed.data;

  const supabase = await supabaseServer();
  let {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Demo visitors onboard without an account: anonymous session on the spot.
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) return { error: "could not start a session — try again" };
    user = anon.user;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = {
    user_id: user.id,
    handle: data.handle,
    name: data.name,
    dept: data.dept,
    year: data.year,
    bio: data.bio || null,
    experience_level: data.experienceLevel,
    commitment_level: data.commitmentLevel,
    availability_windows: data.availability,
    is_seed: false,
  };

  let profileId = existing?.id;
  if (profileId) {
    const { error } = await supabase.from("profiles").update(row).eq("id", profileId);
    if (error) return { error: friendly(error.message) };
  } else {
    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert(row)
      .select("id")
      .single();
    if (error || !inserted) return { error: friendly(error?.message ?? "insert failed") };
    profileId = inserted.id;
  }

  // Replace skill claims wholesale — simplest correct sync, and RLS scopes
  // both statements to the caller's own profile.
  const { error: delError } = await supabase.from("skills").delete().eq("profile_id", profileId);
  if (delError) return { error: friendly(delError.message) };
  const { error: skillError } = await supabase.from("skills").insert(
    data.skills.map((s) => ({
      profile_id: profileId,
      skill: s.skill,
      proficiency: s.proficiency,
      proof_url: s.proofUrl || null,
    })),
  );
  if (skillError) return { error: friendly(skillError.message) };

  redirect(`/p/${data.handle}`);
}

function friendly(msg: string): string {
  if (msg.includes("profiles_handle_key")) return "that handle is taken";
  return msg;
}
