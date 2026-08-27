import { connection } from 'next/server'
import Link from 'next/link'
import { Sparkle, UsersThree } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase'
import { getDemoProfile } from '@/lib/demo'
import { gapFeed, type AvailabilityWindow, type Member, type Requirement } from '@/lib/engine'
import { Page, PageHeader } from '@/components/shell/page-header'
import { SectionHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'
import { SquadCard, type Squad } from '@/components/team/squad-card'

/** How many "looking for you" squads lead the board before the full grid. */
const GAP_FEED_LIMIT = 4

/**
 * Statuses that do NOT put someone on the team. Written as a deny-list because
 * seed data and the join flow each spell "on the team" differently ('accepted',
 * 'active', 'member'), and a card that silently drops real members is worse
 * than one that counts an optimistic row.
 */
const NOT_ON_TEAM = new Set(['pending', 'invited', 'requested', 'declined', 'rejected', 'left'])

type ProfileRow = {
  id: string
  name: string | null
  handle: string | null
  experience_level: number | null
  commitment_level: number | null
  availability_windows: unknown
}

type SkillRow = {
  profile_id: string
  skill: string
  proficiency: number | null
  proof_url: string | null
}

/** The engine's levels are a 1-5 literal union; DB numerics are not. */
function level(n: number | null): 1 | 2 | 3 | 4 | 5 {
  const v = Math.round(n ?? 3)
  return (v < 1 ? 1 : v > 5 ? 5 : v) as 1 | 2 | 3 | 4 | 5
}

/** availability_windows is jsonb, so it is `unknown` until we look. */
function windows(value: unknown): AvailabilityWindow[] {
  return Array.isArray(value) ? (value as AvailabilityWindow[]) : []
}

/**
 * /teams -- the board. Every open squad, scored by the engine, with the ones
 * that need what you have pulled to the top.
 *
 * The reads are five flat selects joined in memory rather than one nested
 * PostgREST embed: the join is tiny (a hackathon's worth of rows), and the
 * whole page depends on the profile pool anyway for the gap feed, so
 * embedding would fetch the same people twice.
 */
export default async function TeamsPage() {
  await connection()
  const db = createServiceClient()

  const [projectsRes, reqsRes, membershipsRes, profilesRes, skillsRes] = await Promise.all([
    db
      .from('projects')
      .select('id, owner_profile_id, event_id, title, description, deadline')
      .order('deadline', { ascending: true, nullsFirst: false }),
    db.from('requirements').select('id, project_id, skill, role_label, weight, min_proficiency'),
    db.from('memberships').select('project_id, profile_id, status'),
    db
      .from('profiles')
      .select('id, name, handle, experience_level, commitment_level, availability_windows'),
    db.from('skills').select('profile_id, skill, proficiency, proof_url'),
  ])

  const projectRows = (projectsRes.data ?? []) as {
    id: string
    owner_profile_id: string | null
    event_id: string | null
    title: string
    description: string | null
    deadline: string | null
  }[]

  const eventIds = [...new Set(projectRows.map((p) => p.event_id).filter(Boolean))] as string[]
  const eventsRes = eventIds.length
    ? await db.from('events').select('id, title').in('id', eventIds)
    : { data: [] }
  const eventById = new Map(
    ((eventsRes.data ?? []) as { id: string; title: string }[]).map((e) => [e.id, e]),
  )

  // Pool: every profile as an engine Member, skills folded in. A proof link is
  // what "verified" means to the engine, so that is the whole test.
  const skillsByProfile = new Map<string, SkillRow[]>()
  for (const s of (skillsRes.data ?? []) as SkillRow[]) {
    const list = skillsByProfile.get(s.profile_id)
    if (list) list.push(s)
    else skillsByProfile.set(s.profile_id, [s])
  }
  const pool: Member[] = ((profilesRes.data ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    name: p.name ?? p.handle ?? 'Someone',
    experienceLevel: level(p.experience_level),
    commitmentLevel: level(p.commitment_level),
    availability: windows(p.availability_windows),
    skills: (skillsByProfile.get(p.id) ?? []).map((s) => ({
      skill: s.skill,
      proficiency: s.proficiency ?? 0,
      verified: Boolean(s.proof_url),
    })),
  }))
  const memberById = new Map(pool.map((m) => [m.id, m]))

  const reqsByProject = new Map<string, Requirement[]>()
  for (const r of (reqsRes.data ?? []) as {
    id: string
    project_id: string
    skill: string
    role_label: string | null
    weight: number | null
    min_proficiency: number | null
  }[]) {
    const req: Requirement = {
      id: r.id,
      skill: r.skill,
      roleLabel: r.role_label ?? undefined,
      weight: r.weight ?? 1,
      minProficiency: r.min_proficiency ?? 0,
    }
    const list = reqsByProject.get(r.project_id)
    if (list) list.push(req)
    else reqsByProject.set(r.project_id, [req])
  }

  const teamIdsByProject = new Map<string, Set<string>>()
  for (const m of (membershipsRes.data ?? []) as {
    project_id: string
    profile_id: string
    status: string | null
  }[]) {
    if (NOT_ON_TEAM.has((m.status ?? '').toLowerCase())) continue
    const set = teamIdsByProject.get(m.project_id) ?? new Set<string>()
    set.add(m.profile_id)
    teamIdsByProject.set(m.project_id, set)
  }

  const squads: Squad[] = projectRows.map((p) => {
    const ids = teamIdsByProject.get(p.id) ?? new Set<string>()
    // The owner is on their own team whether or not a membership row says so;
    // a squad card showing "0 members" for a project someone posted is a lie.
    if (p.owner_profile_id) ids.add(p.owner_profile_id)
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      deadline: p.deadline,
      event: p.event_id ? (eventById.get(p.event_id) ?? null) : null,
      reqs: reqsByProject.get(p.id) ?? [],
      team: [...ids].map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m)),
    }
  })

  const demo = await getDemoProfile()
  const me = demo ? (memberById.get(demo.id) ?? null) : null
  const squadById = new Map(squads.map((s) => [s.id, s]))
  const forYou = me
    ? gapFeed(
        me,
        squads.map((s) => ({ projectId: s.id, reqs: s.reqs, team: s.team })),
      )
        .slice(0, GAP_FEED_LIMIT)
        .map((entry) => ({ squad: squadById.get(entry.projectId)!, gain: entry.gain }))
        .filter((entry) => Boolean(entry.squad))
    : []

  // The rail and the grid used to render the same squad twice, in different
  // pastels, because the tone was keyed on grid position. Showing it once
  // means the rail is a promotion out of the list rather than a copy of it.
  const railIds = new Set(forYou.map((entry) => entry.squad.id))
  const rest = squads.filter((s) => !railIds.has(s.id))

  return (
    // role="main" rather than <main>: Page is the shared shell wrapper and is
    // shared with Olvable's screens, so the landmark is declared per page.
    <Page role="main">
      <PageHeader
        title="Team Board"
        subtitle="Find your next team. Or post what you need."
        actions={
          <Link href="/teams/new" className={buttonVariants({ variant: 'primary' })}>
            Post a request
          </Link>
        }
      />

      {forYou.length ? (
        <section className="mt-8">
          <SectionHeading
            icon={<Sparkle aria-hidden="true" weight="duotone" />}
            title="Squads looking for you"
            aside={`Ranked by what you'd add`}
          />
          {/* A ranked run of cards is a list, so a screen reader gets the count
              and "3 of 4" while arrowing through it. */}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {forYou.map((entry) => (
              <li key={entry.squad.id}>
                <SquadCard
                  squad={entry.squad}
                  gain={{ delta: entry.gain.delta, fills: entry.gain.fills }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionHeading
          icon={<UsersThree aria-hidden="true" weight="duotone" />}
          title={forYou.length ? 'Other squads' : 'All squads'}
          aside={rest.length ? `${rest.length} open` : undefined}
        />
        {squads.length === 0 ? (
          <EmptyState
            icon={<UsersThree aria-hidden="true" weight="duotone" />}
            title="No squads yet"
            body="Nobody has posted what they need. Be the first — say what you're building and which role is missing."
            action={
              <Link href="/teams/new" className={buttonVariants({ variant: 'primary' })}>
                Post a request
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((squad) => (
              <li key={squad.id}>
                <SquadCard squad={squad} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  )
}
