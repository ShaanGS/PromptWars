import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowSquareOut,
  Handshake,
  Medal,
  PuzzlePiece,
  SealCheck,
  Target,
} from '@phosphor-icons/react/dist/ssr'
import {
  UNVERIFIED_DAMP,
  gapFeed,
  guildScore,
  peopleYouShouldMeet,
  type Member,
  type Requirement,
} from '@/lib/engine'
import { createServiceClient } from '@/lib/supabase'
import {
  PROFILE_COLUMNS,
  REQUIREMENT_COLUMNS,
  SKILL_COLUMNS,
  groupSkills,
  toMember,
  toRequirement,
  type ProfileRow,
  type RequirementRow,
  type SkillRow,
} from '@/lib/team/mappers'
import { Page } from '@/components/shell/page-header'
import { SectionHeading } from '@/components/ui/card'
import { Avatar } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'

type ProjectRow = { id: string; title: string; owner_profile_id: string }
type MembershipRow = { project_id: string; profile_id: string; status: string }

const CARD = 'rounded-card border border-line bg-surface p-4 shadow-card sm:p-5'

/**
 * /p/[handle] -- one person, and the case for working with them.
 *
 * The Guild Score is broken open rather than shown as a badge: a score you
 * cannot audit is a vanity metric. Each of the three terms gets a bar and a
 * sentence built from the same numbers the engine used, so "scarcity 0.62"
 * reads as "4 open roles ask for machine-learning and 2 people have it".
 *
 * The two lists below it are the same idea pointed outward -- who completes
 * this person, and which squads their absence is costing.
 */
export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  await connection()
  const { handle } = await params
  const db = createServiceClient()

  const [profiles, skills, requirements, projects, memberships] = await Promise.all([
    db.from('profiles').select(PROFILE_COLUMNS),
    db.from('skills').select(SKILL_COLUMNS),
    db.from('requirements').select(REQUIREMENT_COLUMNS),
    db.from('projects').select('id, title, owner_profile_id'),
    db.from('memberships').select('project_id, profile_id, status'),
  ])

  const profileRows = (profiles.data ?? []) as unknown as ProfileRow[]
  const me = profileRows.find((p) => p.handle === handle)
  if (!me) notFound()

  const skillRows = (skills.data ?? []) as unknown as SkillRow[]
  const reqRows = (requirements.data ?? []) as unknown as RequirementRow[]
  const projectRows = (projects.data ?? []) as unknown as ProjectRow[]
  const membershipRows = (memberships.data ?? []) as unknown as MembershipRow[]

  const skillsByProfile = groupSkills(skillRows)
  const pool = profileRows.map((p) => toMember(p, skillsByProfile.get(p.id) ?? []))
  const meMember = pool[profileRows.indexOf(me)]
  const profileById = new Map(profileRows.map((p) => [p.id, p]))
  const memberById = new Map(pool.map((m) => [m.id, m]))

  // Every requirement in the community is the demand side of the scarcity term.
  const openReqs = reqRows.map(toRequirement)
  const gs = guildScore(meMember, pool, openReqs)

  const reqById = new Map(reqRows.map((r) => [r.id, r]))
  const reqsByProject = new Map<string, Requirement[]>()
  for (const row of reqRows) {
    const list = reqsByProject.get(row.project_id)
    if (list) list.push(toRequirement(row))
    else reqsByProject.set(row.project_id, [toRequirement(row)])
  }

  // The owner is on the squad whether or not a membership row says so, so seed
  // each team with them -- otherwise gapFeed offers you a project you run.
  const teamByProject = new Map<string, Member[]>()
  const addToTeam = (projectId: string, profileId: string) => {
    const member = memberById.get(profileId)
    if (!member) return
    const list = teamByProject.get(projectId)
    if (!list) teamByProject.set(projectId, [member])
    else if (!list.some((m) => m.id === member.id)) list.push(member)
  }
  for (const p of projectRows) addToTeam(p.id, p.owner_profile_id)
  for (const m of membershipRows) if (m.status === 'accepted') addToTeam(m.project_id, m.profile_id)

  const projectById = new Map(projectRows.map((p) => [p.id, p]))
  const gaps = gapFeed(
    meMember,
    projectRows.map((p) => ({
      projectId: p.id,
      reqs: reqsByProject.get(p.id) ?? [],
      team: teamByProject.get(p.id) ?? [],
    })),
  ).slice(0, 3)

  const meet = peopleYouShouldMeet(meMember, pool, 3)

  const claims = [...(skillsByProfile.get(me.id) ?? [])].sort(
    (a, b) =>
      Number(Boolean(b.proof_url)) - Number(Boolean(a.proof_url)) ||
      Number(b.proficiency) - Number(a.proficiency) ||
      a.skill.localeCompare(b.skill),
  )

  const identity = [`@${me.handle}`, me.dept, me.year ? `Year ${me.year}` : null]
    .filter(Boolean)
    .join(' · ')

  const bars = [
    {
      label: 'Credibility',
      value: gs.credibility,
      hint: 'Share of your claims backed by a proof link.',
    },
    { label: 'Versatility', value: gs.versatility, hint: 'Distinct skills, counted up to eight.' },
    {
      label: 'Scarcity',
      value: gs.scarcity,
      hint: 'How short the open squads are of what you have.',
    },
  ]

  return (
    <Page>
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" />
        All people
      </Link>

      <header className={`mt-3 ${CARD}`}>
        <div className="flex flex-wrap items-start gap-4 sm:gap-5">
          <Avatar name={me.name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[36px]">
              {me.name}
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">{identity}</p>
          </div>
        </div>
        {me.bio ? (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">{me.bio}</p>
        ) : null}
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className={CARD}>
            <SectionHeading icon={<Medal weight="duotone" />} title="Guild Score" />
            <div className="flex items-end gap-2.5">
              <p className="text-[52px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-accent">
                {Math.round(gs.total * 100)}
              </p>
              <p className="pb-1.5 text-[13.5px] text-ink-2">out of 100</p>
            </div>

            <div className="mt-5 space-y-4">
              {bars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13.5px] font-medium text-ink">{bar.label}</p>
                    <p className="text-[13px] tabular-nums text-ink-2">
                      {Math.round(bar.value * 100)}%
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${Math.round(bar.value * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-ink-3">{bar.hint}</p>
                </div>
              ))}
            </div>

            {gs.rareSkills.length ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
                  Why the scarcity score
                </p>
                <ul className="mt-2 space-y-1.5">
                  {gs.rareSkills.map((r) => (
                    <li key={r.skill} className="text-[13.5px] leading-relaxed text-ink-2">
                      {rareSentence(r)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-5 border-t border-line pt-4 text-[13.5px] leading-relaxed text-ink-2">
                No open squad is asking for these skills right now, so scarcity scores zero.
              </p>
            )}
          </section>

          <section className={CARD}>
            <SectionHeading
              icon={<PuzzlePiece weight="duotone" />}
              title="Skills"
              aside={claims.length ? `${claims.filter((c) => c.proof_url).length} verified` : null}
            />
            {claims.length === 0 ? (
              <p className="text-[14px] text-ink-2">No skills claimed yet.</p>
            ) : (
              <ul>
                {claims.map((s) => (
                  <li
                    key={s.skill}
                    className="flex items-start gap-3 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium text-ink">
                        {s.skill}
                        {s.proof_url ? (
                          <Pill tone="mint" size="sm">
                            <SealCheck weight="fill" />
                            Verified
                          </Pill>
                        ) : null}
                      </p>
                      {s.proof_url ? (
                        <a
                          href={s.proof_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-1 inline-flex items-center gap-1 text-[13px] text-accent-ink underline-offset-2 hover:underline"
                        >
                          See the proof
                          <ArrowSquareOut size={13} weight="bold" />
                        </a>
                      ) : (
                        <p className="mt-1 text-[13px] text-ink-3">
                          Unverified — an unproved claim counts {UNVERIFIED_DAMP}× when a squad is
                          scored.
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[14.5px] font-medium tabular-nums text-ink-2">
                      {Math.round(Number(s.proficiency) * 100)}%
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className={CARD}>
            <SectionHeading icon={<Handshake weight="duotone" />} title="People you should meet" />
            {meet.length === 0 ? (
              <p className="text-[14px] text-ink-2">Nobody else in the community yet.</p>
            ) : (
              <ul className="-mx-2">
                {meet.map(({ member, comp }) => {
                  const row = profileById.get(member.id)
                  const reason = comp.bFills.length
                    ? `Brings ${comp.bFills.slice(0, 3).join(', ')} you do not have`
                    : 'Same stack as you — no new coverage'
                  return (
                    <li key={member.id}>
                      <Link
                        href={row ? `/p/${row.handle}` : '/people'}
                        className="flex items-center gap-3 rounded-ctl px-2 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <Avatar name={member.name} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-medium text-ink">
                            {member.name}
                          </p>
                          <p className="truncate text-[13px] text-ink-2">{reason}</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {gaps.length ? (
            <section className={CARD}>
              <SectionHeading icon={<Target weight="duotone" />} title="Squads that need you" />
              <ul className="-mx-2">
                {gaps.map(({ projectId, gain }) => {
                  const project = projectById.get(projectId)
                  const filled = gain.fills
                    .map((id) => {
                      const req = reqById.get(id)
                      return req ? (req.role_label ?? req.skill) : null
                    })
                    .filter((label): label is string => Boolean(label))
                  return (
                    <li key={projectId}>
                      <Link
                        href={`/squad/${projectId}`}
                        className="flex items-start gap-3 rounded-ctl px-2 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-medium text-ink">
                            {project?.title ?? 'Untitled squad'}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-ink-2">
                            {filled.length
                              ? `Fills ${filled.slice(0, 2).join(', ')}`
                              : 'Adds depth where they are thin'}
                          </p>
                        </div>
                        <p className="shrink-0 text-[15px] font-semibold tabular-nums text-accent">
                          +{(gain.delta * 100).toFixed(1)}%
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </Page>
  )
}

/** The scarcity term, said out loud with the counts the engine actually used. */
function rareSentence(r: { skill: string; demand: number; supply: number }): string {
  const roles = `${r.demand} open role${r.demand === 1 ? '' : 's'}`
  const asks = r.demand === 1 ? 'asks' : 'ask'
  const supply =
    r.supply === 0
      ? 'nobody in the pool can cover it'
      : `${r.supply === 1 ? '1 person' : `${r.supply} people`} in the pool can cover it`
  return `${roles} ${asks} for ${r.skill}, and ${supply}.`
}
