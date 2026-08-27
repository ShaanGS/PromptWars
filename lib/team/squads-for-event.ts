import { createServiceClient } from '@/lib/supabase'
import type { Member } from '@/lib/engine'
import type { Squad } from '@/components/team/squad-card'
import {
  groupSkills,
  toMember,
  toRequirement,
  type ProfileRow,
  type RequirementRow,
  type SkillRow,
} from './mappers'

/**
 * The squads already aiming at one event.
 *
 * This is the join that makes the two halves of the product one product: the
 * corpus is scraped, and a squad points at a row in it by foreign key, so a
 * listing can show who is already forming for it and offer a way in. Without
 * this read the event pages are a reader and the Team Board is a separate
 * app that happens to share a shell.
 *
 * Returns [] on any failure rather than throwing -- a listing whose team
 * section is empty is a smaller loss than a detail page that 500s.
 */

/** Statuses that do NOT put someone on the team. Mirrors /teams. */
const NOT_ON_TEAM = new Set(['pending', 'invited', 'requested', 'declined', 'rejected', 'left'])

export async function squadsForEvent(eventId: string): Promise<Squad[]> {
  try {
    const db = createServiceClient()

    const { data: projectRows } = await db
      .from('projects')
      .select('id, owner_profile_id, event_id, title, description, deadline')
      .eq('event_id', eventId)

    const projects = (projectRows ?? []) as {
      id: string
      owner_profile_id: string | null
      event_id: string | null
      title: string
      description: string | null
      deadline: string | null
    }[]
    if (projects.length === 0) return []

    const projectIds = projects.map((p) => p.id)
    const [reqsRes, membershipsRes, profilesRes, skillsRes] = await Promise.all([
      db
        .from('requirements')
        .select('id, project_id, skill, role_label, weight, min_proficiency')
        .in('project_id', projectIds),
      db.from('memberships').select('project_id, profile_id, status').in('project_id', projectIds),
      db
        .from('profiles')
        .select('id, name, handle, experience_level, commitment_level, availability_windows'),
      db.from('skills').select('profile_id, skill, proficiency, proof_url'),
    ])

    const skillsByProfile = groupSkills((skillsRes.data ?? []) as SkillRow[])
    const memberById = new Map<string, Member>(
      ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [
        p.id,
        toMember(p, skillsByProfile.get(p.id) ?? []),
      ]),
    )

    const reqsByProject = new Map<string, ReturnType<typeof toRequirement>[]>()
    for (const row of (reqsRes.data ?? []) as (RequirementRow & { project_id: string })[]) {
      const list = reqsByProject.get(row.project_id) ?? []
      list.push(toRequirement(row))
      reqsByProject.set(row.project_id, list)
    }

    const teamIds = new Map<string, Set<string>>()
    for (const m of (membershipsRes.data ?? []) as {
      project_id: string
      profile_id: string
      status: string | null
    }[]) {
      if (NOT_ON_TEAM.has((m.status ?? '').toLowerCase())) continue
      const set = teamIds.get(m.project_id) ?? new Set<string>()
      set.add(m.profile_id)
      teamIds.set(m.project_id, set)
    }

    return projects.map((p) => {
      const ids = teamIds.get(p.id) ?? new Set<string>()
      // The owner is on their own team whether or not a membership row says
      // so, exactly as the board assumes.
      if (p.owner_profile_id) ids.add(p.owner_profile_id)
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        deadline: p.deadline,
        // The card's event pill would repeat the page it is already on.
        event: null,
        reqs: reqsByProject.get(p.id) ?? [],
        team: [...ids].map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m)),
      }
    })
  } catch {
    return []
  }
}
