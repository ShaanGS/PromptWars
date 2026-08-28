'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import { GUILD_HANDLE_COOKIE } from '@/lib/demo'
import {
  toAvailabilityWindows,
  validateProfileDraft,
  type FieldError,
  type ProfileDraft,
} from '@/lib/onboarding/draft'

/**
 * Onboarding's write.
 *
 * Guild used to rank a fixed pool against a hard-coded identity, which made
 * the strongest thing about it -- that the ranking answers to WHO is asking
 * -- impossible to show. Creating a profile puts a real row in the pool, and
 * every surface re-ranks against it immediately: the board's "squads looking
 * for you", the directory's Guild Score, the marginal gain beside your name
 * in a sandbox.
 *
 * It does not disturb what is already on screen. `marginalGain(c)` is
 * `score(team ∪ {c}) − score(team)`, which reads only the roster and the one
 * candidate, so an extra person in the pool cannot move anybody else's delta.
 * The Guild Score's scarcity term does read the pool, so the directory's
 * numbers shift by the one profile's worth of supply -- which is the point.
 */

export type CreateProfileResult = { ok: true; handle: string } | { ok: false; errors: FieldError[] }

function fail(field: string, message: string): CreateProfileResult {
  return { ok: false, errors: [{ field, message }] }
}

export async function createProfile(input: ProfileDraft): Promise<CreateProfileResult> {
  const db = createServiceClient()

  // Handles are the profile's URL, so uniqueness is checked against what is
  // actually stored rather than assumed from the name.
  const { data: existing, error: readError } = await db.from('profiles').select('handle')
  if (readError) {
    return fail('form', 'Could not reach the pool just now. Try again.')
  }
  const taken = ((existing ?? []) as { handle: string | null }[])
    .map((r) => r.handle)
    .filter((h): h is string => Boolean(h))

  const parsed = validateProfileDraft(input, taken)
  if (!parsed.ok) return { ok: false, errors: parsed.errors }
  const { name, handle, draft } = parsed.value

  const { data: created, error: insertError } = await db
    .from('profiles')
    .insert({
      handle,
      name,
      dept: draft.dept,
      year: draft.year,
      experience_level: draft.experienceLevel,
      commitment_level: draft.commitmentLevel,
      availability_windows: toAvailabilityWindows(draft),
      looking_for: draft.lookingFor,
      // Seeded rows are the demo's backdrop; this one is a real person who
      // turned up. `npm run seed` resets toward git and must not claim it.
      is_seed: false,
    })
    .select('id, handle')
    .maybeSingle()

  if (insertError || !created) {
    return fail('form', 'Could not save that profile. Try again.')
  }

  const row = created as { id: string; handle: string }

  // Evidence wins where both exist. A skill we found in a repo we actually
  // fetched carries that repo as its proof and counts in full; a skill only
  // ticked in a box stays unproved and is damped. Writing a proof_url we had
  // not fetched would be the one lie the scoring argument cannot survive.
  const proofBySkill = new Map(draft.githubEvidence.map((e) => [e.skill, e.proofUrl]))
  const everySkill = [...new Set([...draft.skills, ...proofBySkill.keys()])]

  // A profile with no skills is a person the engine can never rank above
  // zero, so a failed skills insert undoes the profile rather than leaving
  // someone permanently unrankable and wondering why.
  const { error: skillsError } = await db.from('skills').insert(
    everySkill.map((skill) => {
      const proof = proofBySkill.get(skill) ?? null
      return {
        profile_id: row.id,
        skill,
        // Backed claims sit higher because the evidence is the difference,
        // and the engine then applies no damp to them at all.
        proficiency: proof ? 0.8 : 0.7,
        proof_url: proof,
      }
    }),
  )
  if (skillsError) {
    await db.from('profiles').delete().eq('id', row.id)
    return fail('skills', 'Could not save those skills. Try again.')
  }

  const jar = await cookies()
  jar.set(GUILD_HANDLE_COOKIE, row.handle, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Every Guild surface reads the pool and the identity, so the whole tree is
  // stale the moment this returns.
  revalidatePath('/', 'layout')
  return { ok: true, handle: row.handle }
}
