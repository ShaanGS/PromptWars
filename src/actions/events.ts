"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMyProfile } from "@/repo/queries";
import { supabaseServer } from "@/repo/server";

const isDate = (v: string) => !Number.isNaN(Date.parse(v));

const schema = z.object({
  title: z.string().trim().min(1, "A title is required").max(160),
  host: z.string().trim().max(120).optional(),
  external_url: z.url("The link must be a full URL, including https://").optional(),
  mode: z.enum(["online", "in_person", "hybrid"]).optional(),
  location: z.string().trim().max(160).optional(),
  deadline_at: z.string().refine(isDate, "That deadline is not a valid date").optional(),
  starts_at: z.string().refine(isDate, "That start date is not a valid date").optional(),
  tags: z.array(z.string().trim().min(1)).max(12),
});

/** FormData gives "" for untouched fields; the column wants null, not "". */
function field(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** datetime-local / date inputs arrive without a zone; anchor them here. */
function toIso(value: string | undefined): string | null {
  return value === undefined ? null : new Date(value).toISOString();
}

export async function postEvent(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const parsed = schema.safeParse({
    title: field(formData, "title") ?? "",
    host: field(formData, "host"),
    external_url: field(formData, "external_url"),
    mode: field(formData, "mode"),
    location: field(formData, "location"),
    deadline_at: field(formData, "deadline_at"),
    starts_at: field(formData, "starts_at"),
    tags: (field(formData, "tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }
  const values = parsed.data;

  // Attribution is the whole point of an organiser post, so a profile is required.
  const profile = await getMyProfile();
  if (!profile) return { error: "Create your profile first" };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("events").insert({
    source: "organiser",
    title: values.title,
    host: values.host ?? null,
    external_url: values.external_url ?? null,
    mode: values.mode ?? null,
    location: values.location ?? null,
    starts_at: toIso(values.starts_at),
    deadline_at: toIso(values.deadline_at),
    tags: values.tags,
    posted_by_profile_id: profile.id,
  });
  // RLS enforces the rest: source must be 'organiser' and the profile must be yours.
  if (error) return { error: error.message };

  revalidatePath("/events");
  redirect("/events");
}
