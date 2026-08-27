import { connection } from 'next/server'
import { DateTime } from 'luxon'
import { createServiceClient } from '@/lib/supabase'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { Page, PageHeader } from '@/components/shell/page-header'
import { NewSquadForm, type EventOption, type SkillSupply } from '@/components/team/new-squad-form'

type EventRow = {
  id: string
  title: string
  starts_at: string | null
  registration_deadline: string | null
}
type SkillRow = { skill: string; proficiency: number | string | null; proof_url: string | null }

/**
 * /teams/new -- the demand side of the problem statement.
 *
 * The page's job is to hand the form two things it cannot invent: the events a
 * squad can be aimed at, and what the pool actually claims. The second is the
 * important one. A requirement is only worth posting if somebody could fill
 * it, and the form reports that live -- so the supply is shipped as raw claims
 * and the browser runs `effectiveProficiency` over them, the same function the
 * server ran to rank the board.
 */
export default async function NewSquadPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  await connection()
  const { event: requestedEventId } = await searchParams
  const db = createServiceClient()

  const [eventsRes, skillsRes] = await Promise.all([
    db
      .from('events')
      .select('id, title, starts_at, registration_deadline')
      .eq('status', 'active')
      .order('starts_at', { ascending: true, nullsFirst: false })
      .limit(60),
    db.from('skills').select('skill, proficiency, proof_url'),
  ])

  const events: EventOption[] = ((eventsRes.data ?? []) as EventRow[]).map((e) => {
    const iso = e.starts_at ?? e.registration_deadline
    const dt = iso ? DateTime.fromISO(iso, { zone: DEFAULT_TZ }) : null
    return { id: e.id, title: e.title, when: dt?.isValid ? dt.toFormat('d LLL') : null }
  })

  const supply: SkillSupply = {}
  for (const row of (skillsRes.data ?? []) as SkillRow[]) {
    const proficiency =
      typeof row.proficiency === 'string' ? Number(row.proficiency) : row.proficiency
    if (!Number.isFinite(proficiency)) continue
    const list = supply[row.skill] ?? (supply[row.skill] = [])
    // A proof link is the whole of what "verified" means to the engine.
    list.push({ proficiency: proficiency as number, verified: Boolean(row.proof_url) })
  }

  // Arriving from a hackathon's own page preselects it. Checked against the
  // list the form was given rather than trusted: an id from the URL that is
  // not an option would select nothing and silently drop the whole reason
  // someone clicked through.
  const preselected = events.some((e) => e.id === requestedEventId) ? requestedEventId : ''
  const aimedAt = preselected ? events.find((e) => e.id === preselected) : null

  return (
    <Page>
      <PageHeader
        eyebrow="Team Board"
        title={aimedAt ? `Post a team for ${aimedAt.title}` : 'Post a request'}
        subtitle="Describe what the project needs, and Guild ranks every person in the pool by what they would add to it."
      />
      <NewSquadForm events={events} supply={supply} initialEventId={preselected} />
    </Page>
  )
}
