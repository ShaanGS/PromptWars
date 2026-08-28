import { connection } from 'next/server'
import Link from 'next/link'
import { Function, ListChecks, Warning } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase'
import {
  marginalGain,
  scoreTeam,
  UNMET_THRESHOLD,
  UNVERIFIED_DAMP,
  WEIGHTS,
  type Member,
  type Requirement,
} from '@/lib/engine'
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
import { Page, PageHeader } from '@/components/shell/page-header'
import { Card, SectionHeading } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'

/**
 * /method -- how the ranking works, stated so it can be checked.
 *
 * Written for a reader who wants to know whether the model is defensible
 * rather than whether the app is pretty: the objective, the properties that
 * hold regardless of the constants, the constants that were chosen rather
 * than fitted, and the things it cannot do.
 *
 * The worked example is COMPUTED, not typed. Every number below runs through
 * the same `lib/engine` functions the board ranks with, against the live
 * database, on request. A page that hard-coded its own arithmetic would be
 * the one place in this project where the maths could quietly stop being
 * true -- which is exactly the claim the page is making.
 */

const MONO = 'rounded-ctl bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-ink'

/** The squad the README and the demo both walk through. */
const EXAMPLE_TITLE = 'CropGuard'

export default async function MethodPage() {
  await connection()
  const db = createServiceClient()

  const [projectsRes, reqsRes, membershipsRes, profilesRes, skillsRes] = await Promise.all([
    db.from('projects').select('id, title, owner_profile_id'),
    db.from('requirements').select(`project_id, ${REQUIREMENT_COLUMNS}`),
    db.from('memberships').select('project_id, profile_id, status'),
    db.from('profiles').select(PROFILE_COLUMNS),
    db.from('skills').select(SKILL_COLUMNS),
  ])

  const projects = (projectsRes.data ?? []) as {
    id: string
    title: string
    owner_profile_id: string | null
  }[]
  const example = projects.find((p) => p.title.startsWith(EXAMPLE_TITLE)) ?? projects[0] ?? null

  const skillsByProfile = groupSkills((skillsRes.data ?? []) as SkillRow[])
  const byId = new Map<string, Member>(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [
      p.id,
      toMember(p, skillsByProfile.get(p.id) ?? []),
    ]),
  )

  const reqs: Requirement[] = example
    ? ((reqsRes.data ?? []) as (RequirementRow & { project_id: string })[])
        .filter((r) => r.project_id === example.id)
        .map(toRequirement)
    : []

  const teamIds = example
    ? [
        ...new Set(
          [
            example.owner_profile_id,
            ...(
              (membershipsRes.data ?? []) as {
                project_id: string
                profile_id: string
                status: string | null
              }[]
            )
              .filter((m) => m.project_id === example.id && m.status === 'accepted')
              .map((m) => m.profile_id),
          ].filter((id): id is string => Boolean(id)),
        ),
      ]
    : []
  const team = teamIds.map((id) => byId.get(id)).filter((m): m is Member => Boolean(m))

  // The demonstration: rank everyone, take the strongest duplicate-risk
  // candidate, then re-rank after seating the person above them.
  const pool = [...byId.values()]
  const outside = pool.filter((m) => !teamIds.includes(m.id))
  const rankedBefore = outside
    .map((m) => ({ m, gain: marginalGain(team, reqs, m) }))
    .sort((a, b) => b.gain.delta - a.gain.delta)

  const top = rankedBefore[0] ?? null
  // The candidate whose value depends most on the top pick being seated: the
  // best-ranked person who fills the same requirement.
  const shadowed =
    top && rankedBefore.slice(1).find((c) => c.gain.fills.some((f) => top.gain.fills.includes(f)))

  const after = top ? [...team, top.m] : team
  const shadowedAfter = shadowed ? marginalGain(after, reqs, shadowed.m) : null

  const worst = rankedBefore[rankedBefore.length - 1] ?? null
  const negatives = rankedBefore.filter((c) => c.gain.delta < 0).length

  const score = scoreTeam(team, reqs)
  const pctOf = (n: number) => `${(n * 100).toFixed(1)}%`

  return (
    <Page role="main">
      <PageHeader
        eyebrow="Method"
        title="How the ranking works"
        subtitle="The objective, the properties that hold, the constants that were chosen rather than fitted, and what the model cannot do."
      />

      <div className="mt-6 flex flex-col gap-4">
        <Card>
          <SectionHeading
            icon={<Function aria-hidden="true" weight="duotone" />}
            title="The objective"
          />
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            Skill search ranks a person against a query — <span className={MONO}>f(candidate)</span>
            . Team quality is a function of the team, so the right object is{' '}
            <span className={MONO}>score(roster)</span>, and a person is ranked by the difference
            they make to it:
          </p>
          <p className="mt-3 overflow-x-auto rounded-ctl bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-ink">
            gain(c) = score(R ∪ {'{'}c{'}'}) − score(R)
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            The roster is an argument. That is the whole difference: a ranker without it cannot
            re-order when the team changes, and the correct order demonstrably does.
          </p>
        </Card>

        <Card>
          <SectionHeading
            icon={<Function aria-hidden="true" weight="duotone" />}
            title="The model"
          />
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            A requirement is covered by anyone clearing its proficiency floor, combined as a
            probabilistic OR — one minus the product of everyone missing it:
          </p>
          <div className="mt-3 overflow-x-auto rounded-ctl bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-ink">
            <p>p(m, r) = proficiency × (backed ? 1 : {UNVERIFIED_DAMP})</p>
            <p className="mt-1.5">coverage(r) = 1 − Π (1 − p(m, r))</p>
            <p className="mt-1.5">base = Σ wᵣ·coverage(r) / Σ wᵣ</p>
            <p className="mt-1.5">
              score = {WEIGHTS.base}·base + {WEIGHTS.overlap}·overlap + {WEIGHTS.balance}·balance +{' '}
              {WEIGHTS.commitment}·commitment
            </p>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            Diminishing returns is not a penalty term. It is what a product of complements does: a
            second person on a covered requirement moves it from 0.8 to 0.9, while the requirement
            nobody covers moves from 0. Nothing in the code says &ldquo;penalise the
            duplicate&rdquo;, so nothing can be tuned to switch it off.
          </p>
        </Card>

        {top && shadowed && shadowedAfter ? (
          <Card>
            <SectionHeading
              icon={<ListChecks aria-hidden="true" weight="duotone" />}
              title="Worked example"
              aside="computed live"
            />
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              {example?.title} currently scores <span className={MONO}>{pctOf(score.score)}</span>,
              with {score.coverage.filter((c) => c.coverage < UNMET_THRESHOLD).length} of{' '}
              {reqs.length} requirements uncovered. Ranking the other {outside.length} people
              against that roster:
            </p>
            <dl className="mt-3 flex flex-col gap-2 text-[14px]">
              <Row
                label={`${top.m.name} (top pick)`}
                value={pctOf(top.gain.delta)}
                note="fills an uncovered requirement"
              />
              <Row
                label={`${shadowed.m.name}, before`}
                value={pctOf(shadowed.gain.delta)}
                note="fills the same requirement"
              />
              <Row
                label={`${shadowed.m.name}, after seating ${top.m.name.split(' ')[0]}`}
                value={pctOf(shadowedAfter.delta)}
                note="nothing about them changed"
                emphasis
              />
            </dl>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              No profile was edited and no model was retrained between those two numbers. The roster
              changed, and the roster is the only input that matters.
            </p>
            {worst && negatives > 0 ? (
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
                {negatives} of the {outside.length} would make this team{' '}
                <span className="font-medium text-ink">worse</span> — the lowest is {worst.m.name}{' '}
                at <span className={MONO}>{pctOf(worst.gain.delta)}</span>. Coverage is only{' '}
                {WEIGHTS.base} of the score; the rest is coordination, so an extra body that fills
                nothing costs shared hours and spread.
              </p>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <SectionHeading
            icon={<ListChecks aria-hidden="true" weight="duotone" />}
            title="Properties, and what they rest on"
          />
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            These hold for <em>any</em> positive weighting, so they are properties of the form
            rather than of the constants:
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-[14.5px] leading-relaxed text-ink-2">
            <Bullet>
              <b className="font-medium text-ink">Monotone in coverage.</b> Another person never
              lowers a requirement&apos;s coverage.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">Saturating.</b> Coverage approaches 1 and never
              exceeds it, so strength cannot be stacked past &ldquo;covered&rdquo;.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">Order-independent.</b> The same set scores the
              same however it was assembled.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">A gap beats a duplicate.</b> Filling a zero is
              worth strictly more than reinforcing a covered requirement, at every parameter
              setting.
            </Bullet>
          </ul>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            Selection is greedy over <span className={MONO}>gain</span>: seat the best candidate,
            re-rank, repeat. Coverage alone is monotone submodular, which would give greedy the
            usual 1−1/e guarantee — but the composite is <em>not</em> monotone, because gains go
            negative. So this is a transparent heuristic that shows its working, not a solver with a
            bound. Each round is <span className={MONO}>O(|pool| · |reqs| · |team|)</span>, which is
            microseconds at campus scale.
          </p>
        </Card>

        <Card>
          <SectionHeading
            icon={<Warning aria-hidden="true" weight="duotone" />}
            title="Limitations"
          />
          <ul className="flex flex-col gap-2 text-[14.5px] leading-relaxed text-ink-2">
            <Bullet>
              <b className="font-medium text-ink">The weights are chosen, not learned.</b>{' '}
              {WEIGHTS.base}/{WEIGHTS.overlap}/{WEIGHTS.balance}/{WEIGHTS.commitment} and the{' '}
              {UNVERIFIED_DAMP} damp are judgement. There are no completed projects to fit them
              against. The properties above are what survives that, because none of them depends on
              the values.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">The OR assumes independence.</b> Two people&apos;s
              competence on one skill is not independent, and <span className={MONO}>p</span> is a
              damped self-report rather than a calibrated probability. The claim is that the product
              is the right <em>shape</em>, not that it is a likelihood.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">&ldquo;Backed&rdquo; means a link exists.</b>{' '}
              Nothing fetches it. The model discounts the absence of evidence; it does not validate
              the presence of it.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">No interpersonal signal.</b> Coordination here is
              calendars, seniority and stated keenness. No communication style, no prior
              collaboration, no trust graph.
            </Bullet>
            <Bullet>
              <b className="font-medium text-ink">No outcome data.</b> Nothing here has been
              validated against teams that actually shipped. That is the experiment this needs next,
              and it needs a season of real projects to run.
            </Bullet>
          </ul>
        </Card>

        <Card>
          <SectionHeading
            icon={<ListChecks aria-hidden="true" weight="duotone" />}
            title="Reproducibility"
          />
          <p className="text-[14.5px] leading-relaxed text-ink-2">
            The model is pure TypeScript with zero dependencies —{' '}
            <span className={MONO}>lib/engine/</span> imports nothing, not React, not the database,
            not a date library. The identical code ranks on the server and re-scores in your browser
            on every click, so the two cannot drift. No language model touches the ranking, so every
            number replays exactly and can be checked against the formula by hand.
          </p>
          <p className="mt-3 flex flex-wrap gap-1.5">
            <Pill tone="mint" size="sm">
              Deterministic
            </Pill>
            <Pill tone="mint" size="sm">
              Zero runtime dependencies
            </Pill>
            <Pill tone="mint" size="sm">
              Claims pinned by unit tests
            </Pill>
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            The tests assert the claims on this page rather than the implementation: that{' '}
            <span className={MONO}>coverage(0.8, 0.5) = 0.9</span> exactly, that an unbacked 0.8
            contributes 0.48, that a claim below a floor contributes nothing, and that a gap-filler
            out-ranks an equally skilled duplicate. If one fails, the argument changed — not the
            code.
          </p>
          <p className="mt-4 text-[14px] text-ink-3">
            Walk it yourself on{' '}
            <Link href="/teams" className="text-accent underline-offset-2 hover:underline">
              the board
            </Link>{' '}
            — every number there comes from these functions.
          </p>
        </Card>
      </div>
    </Page>
  )
}

function Row({
  label,
  value,
  note,
  emphasis,
}: {
  label: string
  value: string
  note: string
  emphasis?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 border-t border-line pt-2 first:border-t-0 first:pt-0">
      <dt className="min-w-0 flex-1 text-ink-2">
        {label}
        <span className="block text-[13px] text-ink-3">{note}</span>
      </dt>
      <dd
        className={
          emphasis
            ? 'font-mono text-[15px] font-semibold tabular-nums text-accent'
            : 'font-mono text-[15px] tabular-nums text-ink'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-line-strong" />
      <span>{children}</span>
    </li>
  )
}
