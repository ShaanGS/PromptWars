import Link from 'next/link'
import { DateTime } from 'luxon'
import { ArrowUpRight, UsersThree } from '@phosphor-icons/react/dist/ssr'
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

  // Coverage comes back one entry per requirement, so the open gaps are just
  // the ones the engine could not fill above the threshold.
  const unmet = squad.reqs.filter((r) => {
    const entry = score.coverage.find((c) => c.requirementId === r.id)
    return (entry?.coverage ?? 0) < UNMET_THRESHOLD
  })

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
      <Link href={href} className="relative block shrink-0" aria-label={squad.title}>
        {/* The same media block the event cards use, with the number that
            decides whether to click as the hero. A team's is how much of it
            is still missing -- the event card puts the date there for the
            same reason: it is the fact you scan for. */}
        <div
          className={cn(
            'relative flex h-40 w-full items-end p-4',
            squad.event ? toneClass(toneFor(squad.event.id)) : 'bg-surface-2 text-ink-2',
          )}
        >
          <UsersThree
            aria-hidden="true"
            size={28}
            weight="duotone"
            className="absolute right-4 top-4 opacity-50"
          />
          <div className="leading-none">
            <p className="text-[44px] font-semibold tracking-[-0.03em]">{unmet.length}</p>
            <p className="mt-1 text-[14px] font-medium opacity-80">
              {unmet.length === 1 ? 'role still open' : 'roles still open'}
              {unmet.length === 0 ? '' : ` of ${squad.reqs.length}`}
            </p>
          </div>
        </div>

        {meta ? (
          <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-7 items-center rounded-full bg-surface/95 px-3 text-[12.5px] font-medium text-ink backdrop-blur-sm">
            {meta}
          </span>
        ) : null}

        {squad.event ? (
          <span className="pointer-events-none absolute inset-x-3 top-3 flex">
            <span className="inline-flex h-6 max-w-full items-center truncate rounded-full bg-surface/95 px-2.5 text-[12px] font-medium text-ink backdrop-blur-sm">
              {squad.event.title}
            </span>
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={href} className="underline-offset-2 hover:underline">
            {squad.title}
          </Link>
        </h3>

        {gain ? (
          // Marginal gain is signed: a sixth body on a team that needs
          // nothing costs overlap. Rendering it as "+-5.4%" was the one place
          // the card contradicted the model it is reporting.
          <p className="mt-2.5">
            <Pill tone={gain.delta >= 0 ? 'accent-soft' : 'neutral'} size="sm">
              {gain.delta >= 0 ? '+' : '−'}
              {Math.abs(gain.delta * 100).toFixed(1)}% to their score
              {role ? ` · you'd take ${labelFor(role)}` : ''}
            </Pill>
          </p>
        ) : squad.description ? (
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">
            {squad.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {unmet.length ? (
            <>
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
            </>
          ) : (
            <Pill tone="mint" size="sm">
              Every role filled
            </Pill>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          {squad.team.length ? (
            <div className="flex -space-x-2" role="img" aria-label={faceLabel ?? undefined}>
              {faces.map((m) => (
                <Avatar key={m.id} name={m.name} size={28} className="ring-2 ring-surface" />
              ))}
              {squad.team.length > MAX_FACES ? (
                <span
                  aria-hidden="true"
                  className="inline-flex size-7 items-center justify-center rounded-full bg-surface-2 text-[11.5px] font-semibold text-ink-2 ring-2 ring-surface"
                >
                  +{squad.team.length - MAX_FACES}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-[13px] text-ink-3">No one yet</span>
          )}
          {/* Nine cards on the board means nine of this link, so the team's
              name goes in the name -- "Open" alone is WCAG 2.4.4. */}
          <Link
            href={href}
            aria-label={`Open ${squad.title}`}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink/85"
          >
            Open
            <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </article>
  )
}
