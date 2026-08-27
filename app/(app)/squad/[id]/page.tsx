import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { CalendarBlank, Ticket } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase'
import type { AvailabilityWindow, Member, Requirement } from '@/lib/engine'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Pill } from '@/components/ui/pill'
import { Sandbox } from '@/components/team/sandbox'

/**
 * /squad/[id] -- the sandbox.
 *
 * The server's only job is to hand the engine plain objects: the pool, the
 * requirements and who is already on the roster. Every number after that is
 * computed in the browser, on every click, from the same pure functions the
 * server would have used. Nothing here is precomputed, so nothing can drift.
 *
 * Reads run through the service client inline rather than lib/queries, because
 * Guild's tables have no per-user scoping to enforce -- the demo has no login.
 */

type ProjectRow = {
  id: string
  title: string
  description: string | null
  deadline: string | null
  owner_profile_id: string
  event_id: string | null
}

type RequirementRow = {
  id: string
  skill: string
  role_label: string | null
  weight: number | string
  min_proficiency: number | string
}

type SkillRow = { skill: string; proficiency: number | string; proof_url: string | null }

type ProfileRow = {
  id: string
  name: string
  experience_level: number
  commitment_level: number
  availability_windows: AvailabilityWindow[] | null
  skills: SkillRow[] | null
}

type EventRow = {
  id: string
  title: string
  starts_at_local: string | null
  is_online: boolean | null
  city: string | null
}

/** Postgres numerics arrive as strings often enough to normalise every one. */
const num = (v: number | string) => Number(v)

/** experience/commitment are check-constrained 1..5 in SQL; the engine's type
 *  is a literal union, so clamp rather than assert. */
const level = (n: number): 1 | 2 | 3 | 4 | 5 =>
  Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5

function toMember(p: ProfileRow): Member {
  return {
    id: p.id,
    name: p.name,
    experienceLevel: level(p.experience_level),
    commitmentLevel: level(p.commitment_level),
    availability: p.availability_windows ?? [],
    skills: (p.skills ?? []).map((s) => ({
      skill: s.skill,
      proficiency: num(s.proficiency),
      // A proof link is the only verification signal we have; the engine damps
      // unverified claims rather than trusting a self-reported number.
      verified: Boolean(s.proof_url),
    })),
  }
}

function toRequirement(r: RequirementRow): Requirement {
  return {
    id: r.id,
    skill: r.skill,
    roleLabel: r.role_label ?? undefined,
    weight: num(r.weight),
    minProficiency: num(r.min_proficiency),
  }
}

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params
  const db = createServiceClient()

  const { data: project } = await db
    .from('projects')
    .select('id, title, description, deadline, owner_profile_id, event_id')
    .eq('id', id)
    .maybeSingle<ProjectRow>()

  if (!project) notFound()

  const [{ data: reqRows }, { data: memberRows }, { data: profileRows }] = await Promise.all([
    db
      .from('requirements')
      .select('id, skill, role_label, weight, min_proficiency')
      .eq('project_id', project.id)
      // Heaviest role first: the gap that costs the most score reads first.
      .order('weight', { ascending: false })
      .order('skill', { ascending: true }),
    db.from('memberships').select('profile_id, status').eq('project_id', project.id),
    db
      .from('profiles')
      .select(
        'id, name, experience_level, commitment_level, availability_windows, skills(skill, proficiency, proof_url)',
      )
      .order('name', { ascending: true })
      .limit(200),
  ])

  const event = project.event_id
    ? ((
        await db
          .from('events')
          .select('id, title, starts_at_local, is_online, city')
          .eq('id', project.event_id)
          .maybeSingle<EventRow>()
      ).data ?? null)
    : null

  const requirements = ((reqRows ?? []) as RequirementRow[]).map(toRequirement)
  const pool = ((profileRows ?? []) as ProfileRow[]).map(toMember)
  const inPool = new Set(pool.map((m) => m.id))

  // Owner first, then accepted members, deduped. A membership pointing at a
  // profile outside the pool would be an id the sandbox can never resolve.
  const accepted = ((memberRows ?? []) as { profile_id: string; status: string }[])
    .filter((m) => m.status === 'accepted')
    .map((m) => m.profile_id)
  const initialTeamIds = [project.owner_profile_id, ...accepted].filter(
    (memberId, i, all) => all.indexOf(memberId) === i && inPool.has(memberId),
  )

  const deadline = project.deadline
    ? DateTime.fromISO(project.deadline, { zone: DEFAULT_TZ })
    : null
  const eventWhen = event?.starts_at_local
    ? DateTime.fromISO(event.starts_at_local, { zone: DEFAULT_TZ }).toFormat('ccc d LLL')
    : null

  return (
    // role="main" rather than <main>: Page is the shared shell wrapper and is
    // shared with Olvable's screens, so the landmark is declared per page.
    <Page role="main">
      <PageHeader
        eyebrow={
          event ? (
            <Link
              href={`/event/${event.id}`}
              aria-label={`${event.title}${eventWhen ? `, ${eventWhen}` : ''} — view the event`}
              className="inline-flex"
            >
              <Pill
                tone="accent-soft"
                className="transition-colors hover:bg-accent hover:text-white"
              >
                <Ticket aria-hidden="true" weight="fill" />
                {event.title}
                {eventWhen ? <span className="opacity-70">· {eventWhen}</span> : null}
              </Pill>
            </Link>
          ) : (
            'Squad'
          )
        }
        title={project.title}
        subtitle={project.description ?? undefined}
        actions={
          deadline ? (
            <Pill tone="outline">
              <CalendarBlank aria-hidden="true" weight="duotone" />
              Due {deadline.toFormat('d LLL')}
            </Pill>
          ) : undefined
        }
      />

      {/* No roster count here. This list is server-rendered outside the
          sandbox, so a seat taken in the browser could never move it, and a
          pill reading "2 on the roster" above a five-person team is the one
          number on this screen that contradicts the demo. The sandbox owns
          the roster and shows it live. */}
      <ul aria-label="Squad at a glance" className="mt-4 flex flex-wrap items-center gap-1.5">
        <li>
          <Pill tone="neutral" size="sm">
            {requirements.length} role{requirements.length === 1 ? '' : 's'}
          </Pill>
        </li>
        <li>
          <Pill tone="neutral" size="sm">
            {pool.length} in the pool
          </Pill>
        </li>
      </ul>

      <div className="mt-6">
        <Sandbox
          pool={pool}
          requirements={requirements}
          initialTeamIds={initialTeamIds}
          ownerId={project.owner_profile_id}
        />
      </div>
    </Page>
  )
}
