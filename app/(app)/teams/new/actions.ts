'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import { getDemoProfile } from '@/lib/demo'
import { validateSquadDraft, type FieldError, type SquadDraft } from '@/lib/team/new-squad'

/**
 * Posting a request -- the first thing in Guild that writes.
 *
 * Everything else in the product reads: the board, the sandbox and the
 * profiles all recompute from seeded rows. This creates three of them
 * (project, requirements, membership) and they are coupled: a project whose
 * requirements failed to insert is a squad asking for nobody, which the board
 * would render as "Ready 100%". So the insert is undone rather than left.
 *
 * There is no session (see SECURITY.md), so the owner is the one seeded
 * identity from lib/demo.ts. When auth returns this is the only line that
 * changes.
 */

export type CreateResult = { ok: true; id: string } | { ok: false; errors: FieldError[] }

function fail(field: string, message: string): CreateResult {
  return { ok: false, errors: [{ field, message }] }
}

export async function createSquad(draft: SquadDraft): Promise<CreateResult> {
  const parsed = validateSquadDraft(draft)
  if (!parsed.ok) return { ok: false, errors: parsed.errors }
  const squad = parsed.value

  const me = await getDemoProfile()
  if (!me) {
    return fail('form', 'No profile is seeded to post as. Run the demo seed and try again.')
  }

  const db = createServiceClient()

  // event_id is a foreign key. A stale id from a form left open while the
  // corpus refreshed would come back as a Postgres constraint error, which is
  // not a sentence anyone should read.
  if (squad.eventId) {
    const { data: event } = await db
      .from('events')
      .select('id')
      .eq('id', squad.eventId)
      .maybeSingle()
    if (!event) return fail('eventId', 'That event is no longer listed. Pick another, or none.')
  }

  const { data: project, error: projectError } = await db
    .from('projects')
    .insert({
      owner_profile_id: me.id,
      event_id: squad.eventId,
      title: squad.title,
      description: squad.description,
      kind: squad.kind,
      effort: squad.effort,
      is_seed: false,
    })
    .select('id')
    .single()

  if (projectError || !project) {
    return fail('form', `Could not post the request: ${projectError?.message ?? 'unknown error'}`)
  }

  const { error: reqError } = await db.from('requirements').insert(
    squad.requirements.map((r) => ({
      project_id: project.id,
      skill: r.skill,
      role_label: r.roleLabel,
      weight: r.weight,
      min_proficiency: r.minProficiency,
    })),
  )

  if (reqError) {
    await db.from('projects').delete().eq('id', project.id)
    return fail('form', `Could not save the roles: ${reqError.message}`)
  }

  // The owner is on their own roster -- every seeded squad counts its owner,
  // and the engine scores a team of nobody as a team of nobody.
  const { error: memberError } = await db
    .from('memberships')
    .insert({ project_id: project.id, profile_id: me.id, status: 'accepted' })

  if (memberError) {
    await db.from('requirements').delete().eq('project_id', project.id)
    await db.from('projects').delete().eq('id', project.id)
    return fail('form', `Could not add you to the roster: ${memberError.message}`)
  }

  revalidatePath('/teams')
  revalidatePath('/people')
  revalidatePath(`/p/${me.handle}`)

  return { ok: true, id: project.id }
}
