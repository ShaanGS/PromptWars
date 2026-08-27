import Link from 'next/link'
import { ArrowUpRight, CalendarBlank, Ticket } from '@phosphor-icons/react/dist/ssr'
import { DateTime } from 'luxon'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { scoreTeam, UNMET_THRESHOLD, type MarginalGain } from '@/lib/engine'
import { Avatar } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'
import { cn } from '@/lib/utils'
import type { Squad } from './squad-card'

/** Roles past this many fold into a "+N" pill so a row stays one line deep. */
const MAX_NEEDS = 4

/**
 * A team, as a full-width row.
 *
 * The board is a list of asks, and an ask is a sentence: who is building
 * what, and which role is missing. A three-column grid of tall cards makes
 * that sentence wrap four times and puts three of them on a screen; a row
 * gives the description room to be read and fits six. The card
 * (components/team/squad-card.tsx) is still right where teams appear beside
 * an event and the grid is only two wide.
 *
 * The left edge is coloured by kind, which is the one thing people filter on
 * before they read anything -- a hackathon ask and a research ask are
 * different decisions.
 */

const KIND_LABEL: Record<string, string> = {
  hackathon: 'Hackathon',
  research: 'Research',
  startup: 'Startup',
  side_project: 'Side project',
  project: 'Project',
}

const KIND_EDGE: Record<string, string> = {
  hackathon: 'bg-accent',
  research: 'bg-sky-ink',
  startup: 'bg-lemon-ink',
  side_project: 'bg-mint-ink',
  project: 'bg-line-strong',
}

export function TeamRow({
  squad,
  kind,
  effort,
  owner,
  gain,
}: {
  squad: Squad
  kind: string | null
  effort: string | null
  owner: { name: string; dept: string | null } | null
  /** Present when we know who is looking: what joining would be worth. */
  gain?: { delta: number; fills: MarginalGain['fills'] }
}) {
  const score = scoreTeam(squad.team, squad.reqs)
  const unmet = squad.reqs.filter((r) => {
    const entry = score.coverage.find((c) => c.requirementId === r.id)
    return (entry?.coverage ?? 0) < UNMET_THRESHOLD
  })
  const filled = squad.reqs.length - unmet.length
  const deadline = squad.deadline ? DateTime.fromISO(squad.deadline, { zone: DEFAULT_TZ }) : null
  const href = `/squad/${squad.id}`
  const kindKey = kind ?? 'project'

  return (
    <article className="group relative overflow-hidden rounded-card border border-line bg-surface pl-1 shadow-card transition-colors hover:border-line-strong">
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-0 left-0 w-1', KIND_EDGE[kindKey] ?? KIND_EDGE.project)}
      />

      <div className="p-4 sm:p-5">
        <h3 className="text-[17.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={href} className="underline-offset-2 hover:underline">
            {squad.title}
          </Link>
        </h3>

        {owner ? (
          <p className="mt-2 flex items-center gap-2 text-[13.5px] text-ink-2">
            <Avatar name={owner.name} size={22} />
            <span className="truncate">
              {owner.name}
              {owner.dept ? ` · ${owner.dept}` : ''}
            </span>
          </p>
        ) : null}

        {squad.description ? (
          <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-ink-2">
            {squad.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {unmet.length ? (
            <>
              {unmet.slice(0, MAX_NEEDS).map((r) => (
                // "Needs:" on the pill itself, not as a label beside the row.
                // Scanning a list, the eye lands on a pill before it lands on
                // the grey word introducing it.
                <Pill key={r.id} tone="lemon" size="sm">
                  Needs {r.roleLabel ?? r.skill}
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

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone="neutral" size="sm">
            {KIND_LABEL[kindKey] ?? KIND_LABEL.project}
          </Pill>
          {effort ? (
            <Pill tone="outline" size="sm">
              {effort}
            </Pill>
          ) : null}
          {squad.event ? (
            <Pill tone="accent-soft" size="sm">
              <Ticket aria-hidden="true" weight="fill" />
              {squad.event.title}
            </Pill>
          ) : null}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
          <p className="text-[13px] text-ink-2">
            <span className="tabular-nums">
              {filled} of {squad.reqs.length}
            </span>{' '}
            roles filled
          </p>

          {deadline ? (
            <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
              <CalendarBlank
                aria-hidden="true"
                size={14}
                weight="bold"
                className="shrink-0 text-ink-3"
              />
              Due {deadline.toFormat('d LLL')}
            </p>
          ) : null}

          {gain ? (
            <p
              className={cn(
                'text-[13px] font-medium',
                gain.delta >= 0 ? 'text-accent' : 'text-ink-3',
              )}
            >
              {gain.delta >= 0 ? '+' : '−'}
              {Math.abs(gain.delta * 100).toFixed(1)}% if you join
            </p>
          ) : null}

          <Link
            href={href}
            aria-label={`Open ${squad.title}`}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink/85"
          >
            Open team
            <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </article>
  )
}
