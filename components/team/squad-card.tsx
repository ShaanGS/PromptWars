import Link from 'next/link'
import { DateTime } from 'luxon'
import { ArrowUpRight, CalendarBlank, UsersThree } from '@phosphor-icons/react/dist/ssr'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { scoreTeam, UNMET_THRESHOLD, type MarginalGain, type Member, type Requirement } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/bits'
import { CATEGORY_TONES, Pill } from '@/components/ui/pill'

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
  index,
}: {
  squad: Squad
  /** Present in the "looking for you" rail: what joining would be worth. */
  gain?: { delta: number; fills: MarginalGain['fills'] }
  /** Position in its grid -- drives the pastel so a row never repeats a hue. */
  index: number
}) {
  const score = scoreTeam(squad.team, squad.reqs)
  const band = readiness(score.base)
  const pct = Math.round(score.base * 100)

  // Coverage comes back one entry per requirement, so the open gaps are just
  // the ones the engine could not fill above the threshold.
  const unmet = squad.reqs.filter((r) => {
    const entry = score.coverage.find((c) => c.requirementId === r.id)
    return (entry?.coverage ?? 0) < UNMET_THRESHOLD
  })

  const deadline = squad.deadline
    ? DateTime.fromISO(squad.deadline, { zone: DEFAULT_TZ })
    : null
  const meta = [
    `${squad.team.length} member${squad.team.length === 1 ? '' : 's'}`,
    deadline ? `Due ${deadline.toFormat('ccc d LLL')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const role = gain?.fills.length
    ? (squad.reqs.find((r) => r.id === gain.fills[0]) ?? null)
    : null
  const href = `/squad/${squad.id}`

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-line-strong">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          {squad.event ? (
            <Pill tone={CATEGORY_TONES[index % CATEGORY_TONES.length]} size="sm">
              {squad.event.title}
            </Pill>
          ) : (
            <Pill tone="neutral" size="sm">
              Project
            </Pill>
          )}
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-surface/95 px-2.5 text-[12px] font-medium text-ink backdrop-blur-sm">
            <span className={cn('size-1.5 rounded-full', band.dot)} />
            {band.label}
            <span className="tabular-nums text-ink-3">{pct}</span>
          </span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={href} className="hover:underline underline-offset-2">
            {squad.title}
          </Link>
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-ink-2">
          {deadline ? (
            <CalendarBlank size={15} weight="bold" className="shrink-0 text-ink-3" />
          ) : (
            <UsersThree size={15} weight="bold" className="shrink-0 text-ink-3" />
          )}
          <span className="truncate">{meta}</span>
        </p>

        {gain ? (
          <p className="mt-2.5 text-[13.5px] font-medium text-accent">
            +{(gain.delta * 100).toFixed(1)}%
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

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 border-t border-line pt-3">
            {squad.team.length ? (
              <div className="flex -space-x-2">
                {squad.team.slice(0, MAX_FACES).map((m) => (
                  <Avatar key={m.id} name={m.name} size={28} className="ring-2 ring-surface" />
                ))}
                {squad.team.length > MAX_FACES ? (
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-2 text-[11.5px] font-semibold text-ink-2 ring-2 ring-surface">
                    +{squad.team.length - MAX_FACES}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-[13px] text-ink-3">No one yet</span>
            )}
            <Link
              href={href}
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink/85"
            >
              Open
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
