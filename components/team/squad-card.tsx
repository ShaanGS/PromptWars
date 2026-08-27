import Link from 'next/link'
import { DateTime } from 'luxon'
import { ArrowUpRight, CalendarBlank } from '@phosphor-icons/react/dist/ssr'
import { DEFAULT_TZ } from '@/lib/dates/types'
import {
  scoreTeam,
  UNMET_THRESHOLD,
  type MarginalGain,
  type Member,
  type Requirement,
} from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Avatar, toneClass } from '@/components/ui/bits'
import { Pill, toneFor } from '@/components/ui/pill'

/**
 * A squad as the board needs it: the project row, the requirements it posted,
 * the people already on it, and the event it is aimed at. Assembled by the
 * page, not fetched here -- the card stays a pure render so the sandbox can
 * reuse it against a recomputed team.
 */
export type Squad = {
  id: string
  title: string
  description: string | null
  deadline: string | null
  event: { id: string; title: string } | null
  reqs: Requirement[]
  team: Member[]
}

/**
 * Readiness band. Same vocabulary as lib/theme's relevance bands -- a label,
 * a dot, and a number -- because a card only gets to teach one badge grammar
 * and the feed already taught this one.
 */
function readiness(base: number): { label: string; dot: string } {
  const pct = base * 100
  if (pct >= 85) return { label: 'Ready', dot: 'bg-accent' }
  if (pct >= 60) return { label: 'Getting there', dot: 'bg-success' }
  if (pct >= 35) return { label: 'Thin', dot: 'bg-lemon-ink' }
  return { label: 'Needs people', dot: 'bg-line-strong' }
}

function labelFor(req: Requirement): string {
  return req.roleLabel ?? req.skill
}

/** How many gap pills fit before the card starts growing taller than its row. */
const MAX_NEEDS = 4
/** Faces shown before the overflow count takes over. */
const MAX_FACES = 4

/**
 * The squad card -- the event card's skeleton with the banner swapped for the
 * only thing that matters here: how close this team is to being whole, and
 * what it is still missing.
 */
export function SquadCard({
  squad,
  gain,
}: {
  squad: Squad
  /** Present in the "looking for you" rail: what joining would be worth. */
  gain?: { delta: number; fills: MarginalGain['fills'] }
}) {
  const score = scoreTeam(squad.team, squad.reqs)
  const band = readiness(score.base)

  // Coverage comes back one entry per requirement, so the open gaps are just
  // the ones the engine could not fill above the threshold.
  const unmet = squad.reqs.filter((r) => {
    const entry = score.coverage.find((c) => c.requirementId === r.id)
    return (entry?.coverage ?? 0) < UNMET_THRESHOLD
  })

  const filled = squad.reqs.length - unmet.length

  const deadline = squad.deadline ? DateTime.fromISO(squad.deadline, { zone: DEFAULT_TZ }) : null
  // The roster count moved into the stat row below, so this line carries only
  // what that row cannot: when the thing is actually due.
  const meta = deadline ? `Due ${deadline.toFormat('ccc d LLL')}` : null

  const role = gain?.fills.length ? (squad.reqs.find((r) => r.id === gain.fills[0]) ?? null) : null
  const href = `/squad/${squad.id}`

  // The face pile is the only place a member's name is not written out, so the
  // stack carries the names itself -- the Avatars inside it are aria-hidden.
  const faces = squad.team.slice(0, MAX_FACES)
  const faceLabel = squad.team.length
    ? `On the roster: ${squad.team.map((m) => m.name).join(', ')}`
    : null

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-line-strong">
      {/* The event is the band, not a pill in the corner. A squad exists
          because of the thing it is entering, so that is what the card leads
          with -- and the colour is keyed on the event id, so one hackathon
          wears one colour wherever its card appears. */}
      <div
        className={cn(
          'flex h-11 items-center justify-between gap-2 px-4',
          squad.event ? toneClass(toneFor(squad.event.id)) : 'bg-surface-2 text-ink-2',
        )}
      >
        <span className="truncate text-[12.5px] font-semibold">
          {squad.event ? squad.event.title : 'Project'}
        </span>
        {/* A count, not a percentage. The badge used to print pure coverage
            ("36") one click away from a screen showing the composite score
            ("55%") for the same team, with nothing on either explaining the
            gap. "2 of 5 roles filled" is the same sentence in both places. */}
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-surface/90 px-2.5 text-[12px] font-medium text-ink">
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', band.dot)} />
          <span className="tabular-nums">
            {filled} of {squad.reqs.length}
          </span>
          roles filled
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={href} className="hover:underline underline-offset-2">
            {squad.title}
          </Link>
        </h3>

        <div
          className="mt-3 flex -space-x-2"
          role="img"
          aria-label={faceLabel ?? 'Nobody on the team yet'}
        >
          {faces.length ? (
            faces.map((m) => (
              <Avatar key={m.id} name={m.name} size={30} className="ring-2 ring-surface" />
            ))
          ) : (
            <span className="text-[13px] text-ink-3">No one yet</span>
          )}
          {squad.team.length > MAX_FACES ? (
            <span
              aria-hidden="true"
              className="inline-flex size-[30px] items-center justify-center rounded-full bg-surface-2 text-[11.5px] font-semibold text-ink-2 ring-2 ring-surface"
            >
              +{squad.team.length - MAX_FACES}
            </span>
          ) : null}
        </div>

        {gain ? (
          // Marginal gain is signed: a sixth body on a team that needs
          // nothing costs overlap. Rendering it as "+-5.4%" was the one place
          // the card contradicted the model it is reporting.
          <p
            className={cn(
              'mt-2.5 text-[13.5px] font-medium',
              gain.delta >= 0 ? 'text-accent' : 'text-ink-3',
            )}
          >
            {gain.delta >= 0 ? '+' : '−'}
            {Math.abs(gain.delta * 100).toFixed(1)}%
            <span className="sr-only"> to their team score</span>
            {role ? (
              <span className="font-normal text-ink-2"> if you take {labelFor(role)}</span>
            ) : null}
          </p>
        ) : squad.description ? (
          <p className="mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">
            {squad.description}
          </p>
        ) : null}

        {unmet.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[12.5px] font-medium text-ink-3">Needs</span>
            {unmet.slice(0, MAX_NEEDS).map((r) => (
              <Pill key={r.id} tone="outline" size="sm">
                {labelFor(r)}
              </Pill>
            ))}
            {unmet.length > MAX_NEEDS ? (
              <Pill tone="neutral" size="sm">
                +{unmet.length - MAX_NEEDS}
              </Pill>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
          {meta ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
              <CalendarBlank
                aria-hidden="true"
                size={14}
                weight="bold"
                className="shrink-0 text-ink-3"
              />
              <span className="truncate">{meta}</span>
            </p>
          ) : (
            <span className="text-[13px] text-ink-3">{squad.team.length} joined</span>
          )}
          {/* Nine cards on the board means nine of this link, so the team's
              name goes in the name -- "Open" alone is WCAG 2.4.4. */}
          <Link
            href={href}
            aria-label={`Open ${squad.title}`}
            className="ml-auto inline-flex shrink-0 items-center gap-1 text-[13.5px] font-medium text-accent underline-offset-2 hover:underline"
          >
            Open
            <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </article>
  )
}
