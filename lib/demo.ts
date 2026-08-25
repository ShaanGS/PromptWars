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
 */
export async function getDemoProfile(): Promise<DemoProfile | null> {
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('profiles')
      .select(COLUMNS)
      .eq('handle', DEMO_PROFILE_HANDLE)
      .maybeSingle()

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
}
