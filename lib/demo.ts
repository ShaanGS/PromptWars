import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import type { AvailabilityWindow } from '@/lib/engine'

/**
 * Who "you" are in the demo build.
 *
 * Auth is gone (see middleware.ts), so there is no session to read an
 * identity from. Every screen that used to say "the signed-in user" now means
 * this one seeded profile: it owns the Guild projects, it is the `me` that
 * People You Should Meet ranks against, and it is what the profile screen
 * shows. One handle, hard-coded, so the demo is the same on every machine and
 * after every reseed.
 */
export const DEMO_PROFILE_HANDLE = 'aarav'

/**
 * Where "you" is remembered after onboarding creates a profile.
 *
 * A cookie rather than a session because there is no auth (see SECURITY.md),
 * and per-visitor rather than global because two people opening the demo on
 * two phones must not become the same person.
 */
export const GUILD_HANDLE_COOKIE = 'guild-handle'

export type DemoSkill = {
  skill: string
  proficiency: number
  proof_url: string | null
}

export type DemoProfile = {
  id: string
  handle: string
  name: string
  dept: string
  year: number | null
  bio: string | null
  experience_level: number
  commitment_level: number
  availability_windows: AvailabilityWindow[]
  skills: DemoSkill[]
}

const COLUMNS =
  'id, handle, name, dept, year, bio, experience_level, commitment_level, availability_windows, skills(skill, proficiency, proof_url)'

/**
 * The demo profile with its skills, or null.
 *
 * Never throws. A missing row, an unseeded database, or absent Supabase env
 * vars all return null, because the alternative is a hard 500 on the root
 * layout in front of judges. Callers render an empty state instead.
 *
 * Wrapped in React's `cache`, which memoises per request: "who am I" is asked
 * by every Guild screen and could be asked twice on one render (a layout and
 * the page inside it), and that must not become two queries for a row that
 * cannot change mid-render.
 */
export const getDemoProfile = cache(async function getDemoProfile(): Promise<DemoProfile | null> {
  try {
    const db = createServiceClient()

    // Whoever onboarding last created on this device, falling back to the
    // seeded identity. Reading the cookie is what makes the rankings answer
    // to the person asking rather than to a constant.
    const jar = await cookies()
    const handle = jar.get(GUILD_HANDLE_COOKIE)?.value || DEMO_PROFILE_HANDLE

    let { data, error } = await db
      .from('profiles')
      .select(COLUMNS)
      .eq('handle', handle)
      .maybeSingle()

    // A cookie can outlive the row it names -- a reseed drops user profiles.
    // Falling back beats showing an empty shell to somebody who onboarded.
    if ((error || !data) && handle !== DEMO_PROFILE_HANDLE) {
      ;({ data, error } = await db
        .from('profiles')
        .select(COLUMNS)
        .eq('handle', DEMO_PROFILE_HANDLE)
        .maybeSingle())
    }

    if (error || !data) return null

    const row = data as unknown as DemoProfile & { skills: DemoSkill[] | null }
    return {
      ...row,
      // A profile with no skill rows comes back with skills: null from PostgREST.
      skills: row.skills ?? [],
      availability_windows: row.availability_windows ?? [],
    }
  } catch {
    return null
  }
})
