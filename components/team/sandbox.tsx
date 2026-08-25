'use client'

import * as React from 'react'
import { ArrowClockwise, MagicWand, Plus, ShieldWarning, X } from '@phosphor-icons/react'
import {
  autoDraft,
  rankCandidates,
  scoreTeam,
  teamRisks,
  UNMET_THRESHOLD,
  type CoverageEntry,
  type MarginalGain,
  type Member,
  type Requirement,
  type Risk,
  type TeamScore,
} from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Avatar, EmptyState } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { Card, SectionHeading } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'

/** One greedy pick lands every 420ms -- slow enough to read the score climb. */
const DRAFT_STEP_MS = 420

/** How many candidates the ranked list shows. Beyond ten nobody scrolls. */
const CANDIDATE_LIMIT = 10

const pct = (n: number) => `${Math.round(n * 100)}%`

/** Marginal gain can be negative -- adding a sixth person costs overlap. */
const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n * 100).toFixed(1)}%`

type Props = {
  pool: Member[]
  requirements: Requirement[]
  initialTeamIds: string[]
  /** The project owner. Present in every roster and never removable. */
  ownerId: string
}

/**
 * The squad sandbox: the one screen where the engine is visible.
 *
 * Everything here is recomputed from scratch on every render. scoreTeam /
 * rankCandidates / teamRisks are pure and cost well under a millisecond for a
 * pool this size, so there is no cache to invalidate and no server round trip
 * between a click and a new score -- which is the whole point of the demo.
 */
export function Sandbox({ pool, requirements, initialTeamIds, ownerId }: Props) {
  const [teamIds, setTeamIds] = React.useState<string[]>(initialTeamIds)
  const [drafting, setDrafting] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const byId = React.useMemo(() => new Map(pool.map((m) => [m.id, m])), [pool])

  const stop = React.useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setDrafting(false)
  }, [])

  // A draft in flight must not outlive the screen it is animating.
  React.useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  const team = teamIds.map((id) => byId.get(id)).filter((m): m is Member => Boolean(m))
  const ts = scoreTeam(team, requirements)
  const ranked = rankCandidates(team, requirements, pool).slice(0, CANDIDATE_LIMIT)
  const risks = teamRisks(team, requirements)
  const openCount = ts.coverage.filter((c) => c.coverage < UNMET_THRESHOLD).length

  const add = (id: string) => setTeamIds((t) => (t.includes(id) ? t : [...t, id]))
  const remove = (id: string) => {
    if (id === ownerId) return
    stop()
    setTeamIds((t) => t.filter((x) => x !== id))
  }

  /**
   * Auto-draft narrates the greedy algorithm rather than jumping to the answer:
   * the whole run is computed up front, then replayed one pick at a time so the
   * score bar visibly climbs and each gap closes on screen.
   */
  const runDraft = () => {
    if (drafting) return
    const { picks } = autoDraft(pool, requirements, {
      start: team,
      maxSize: Math.max(requirements.length + 1, team.length + 1),
    })
    if (picks.length === 0) return
    setDrafting(true)
    let i = 0
    timer.current = setInterval(() => {
      const pick = picks[i++]
      if (!pick) {
        stop()
        return
      }
      setTeamIds((t) => (t.includes(pick.member.id) ? t : [...t, pick.member.id]))
    }, DRAFT_STEP_MS)
  }

  const reset = () => {
    stop()
    setTeamIds(initialTeamIds)
  }

  if (requirements.length === 0) {
    return (
      <EmptyState
        icon={<ShieldWarning weight="duotone" />}
        title="This squad has no roles yet"
        body="Add a requirement — a skill, a weight and a minimum — and the engine will start ranking people against it."
      />
    )
  }

  const candidates = (
    <CandidateList
      ranked={ranked}
      byId={byId}
      requirements={requirements}
      team={team}
      drafting={drafting}
      onAdd={add}
      onDraft={runDraft}
      onReset={reset}
    />
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <ScoreCard ts={ts} openCount={openCount} total={requirements.length} />

        <section aria-label="Roles" className="flex flex-col gap-3">
          {requirements.map((req) => (
            <Slot
              key={req.id}
              req={req}
              entry={ts.coverage.find((c) => c.requirementId === req.id)}
              team={team}
              ownerId={ownerId}
              onRemove={remove}
            />
          ))}
        </section>

        {/* On a phone the candidates belong right under the gaps they fill. */}
        <div className="lg:hidden">{candidates}</div>

        <RiskPanel risks={risks} />
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">{candidates}</aside>
    </div>
  )
}

function ScoreCard({ ts, openCount, total }: { ts: TeamScore; openCount: number; total: number }) {
  const parts = [
    { label: 'Coverage', value: ts.base },
    { label: 'Overlap', value: ts.overlap },
    { label: 'Balance', value: ts.balance },
    { label: 'Commitment', value: ts.commitment },
  ]

  return (
    <Card padded={false}>
      <div className="flex items-end justify-between gap-4 p-4 pb-3.5 sm:p-5 sm:pb-4">
        <div>
          <p className="text-[13px] font-medium text-ink-2">Team score</p>
          <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink sm:text-[52px]">
            {Math.round(ts.score * 100)}
            <span className="text-[24px] text-ink-3">%</span>
          </p>
        </div>
        <p className="max-w-[48%] pb-1.5 text-right text-[13.5px] leading-snug text-ink-2">
          {openCount === 0
            ? `All ${total} role${total === 1 ? '' : 's'} covered.`
            : `${openCount} of ${total} role${total === 1 ? '' : 's'} still open.`}
        </p>
      </div>

      <div className="mx-4 h-2 overflow-hidden rounded-full bg-surface-2 sm:mx-5">
        <Bar value={ts.score} className="bg-accent" />
      </div>

      <div className="mt-4 grid grid-cols-4 divide-x divide-line border-t border-line">
        {parts.map((p) => (
          <div key={p.label} className="px-2 py-3 text-center">
            <p className="text-[15px] font-semibold tabular-nums text-ink">{pct(p.value)}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-3">{p.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Progress fill. Animates transform, not width, so the browser never relayouts
 * mid-draft; motion-reduce users get the same end state with no travel.
 */
function Bar({ value, className }: { value: number; className: string }) {
  const scale = Math.max(0, Math.min(1, value))
  return (
    <div
      className={cn(
        'h-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none',
        className,
      )}
      style={{ transform: `scaleX(${scale})` }}
    />
  )
}

function Slot({
  req,
  entry,
  team,
  ownerId,
  onRemove,
}: {
  req: Requirement
  entry: CoverageEntry | undefined
  team: Member[]
  ownerId: string
  onRemove: (id: string) => void
}) {
  const coverage = entry?.coverage ?? 0
  const label = req.roleLabel ?? req.skill

  // An open slot is the loudest thing on the page on purpose: it is the only
  // question this screen is asking.
  if (coverage < UNMET_THRESHOLD) {
    return (
      <div className="rounded-card border-2 border-dashed border-accent bg-accent-soft p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-accent-ink">
              Open slot
            </p>
            <p className="mt-1 truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {label}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-accent-ink">
              <span className="font-medium">{req.skill}</span>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span className="opacity-80">weight {req.weight}</span>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span className="opacity-80">needs {pct(req.minProficiency)} min</span>
            </p>
          </div>
          <span className="shrink-0 text-[20px] font-semibold tabular-nums text-accent-ink">
            {pct(coverage)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            {label}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {req.skill} · weight {req.weight}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2 sm:w-24">
            <Bar value={coverage} className="bg-success" />
          </div>
          <span className="text-[14px] font-semibold tabular-nums text-ink">{pct(coverage)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(entry?.contributors ?? []).map((c) => {
          const m = team.find((x) => x.id === c.memberId)
          if (!m) return null
          return (
            <span
              key={c.memberId}
              className="flex items-center gap-2 rounded-full border border-line bg-surface-2 p-1"
            >
              <Avatar name={m.name} size={26} />
              <span className="text-[13.5px] font-medium text-ink">{m.name}</span>
              <span className="text-[12.5px] tabular-nums text-ink-2">{pct(c.effective)}</span>
              {c.memberId === ownerId ? (
                <span className="pr-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                  Owner
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => onRemove(c.memberId)}
                  className="flex size-6 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger-ink"
                >
                  <X size={13} weight="bold" />
                </button>
              )}
            </span>
          )
        })}
      </div>
    </Card>
  )
}

function CandidateList({
  ranked,
  byId,
  requirements,
  team,
  drafting,
  onAdd,
  onDraft,
  onReset,
}: {
  ranked: MarginalGain[]
  byId: Map<string, Member>
  requirements: Requirement[]
  team: Member[]
  drafting: boolean
  onAdd: (id: string) => void
  onDraft: () => void
  onReset: () => void
}) {
  const labelOf = (id: string) => {
    const r = requirements.find((x) => x.id === id)
    return r?.roleLabel ?? r?.skill ?? id
  }
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? 'someone'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Best next member</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="accent" size="sm" onClick={onDraft} disabled={drafting}>
            <MagicWand weight="fill" />
            {drafting ? 'Drafting' : 'Auto-draft'}
          </Button>
          <Button size="icon-sm" onClick={onReset} aria-label="Reset roster">
            <ArrowClockwise weight="bold" />
          </Button>
        </div>
      </div>

      {ranked.length === 0 ? (
        <Card>
          <p className="text-[14px] text-ink-2">Everyone in the pool is already on this squad.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {ranked.map((gain) => {
            const c = byId.get(gain.candidateId)
            if (!c) return null
            const fillsGap = gain.fills.length > 0
            const top = [...c.skills].sort((a, b) => b.proficiency - a.proficiency).slice(0, 3)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onAdd(c.id)}
                className="group w-full rounded-card border border-line bg-surface p-3 text-left shadow-card transition-colors hover:border-line-strong"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-[13px] text-ink-3">
                      {top.map((s) => s.skill).join(' · ') || 'No skills listed'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        'text-[14px] font-semibold tabular-nums',
                        fillsGap ? 'text-accent' : 'text-ink-3',
                      )}
                    >
                      {signedPct(gain.delta)}
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent-ink transition-colors group-hover:bg-accent group-hover:text-white">
                      <Plus size={14} weight="bold" />
                    </span>
                  </div>
                </div>

                {gain.fills.length > 0 || gain.duplicates.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {gain.fills.map((id) => (
                      <Pill key={id} tone="accent-soft" size="sm">
                        fills {labelOf(id)}
                      </Pill>
                    ))}
                    {gain.duplicates.map((d) => (
                      <Pill key={d.requirementId} tone="neutral" size="sm">
                        {nameOf(d.alreadyCoveredBy[0])} already covers {labelOf(d.requirementId)}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RiskPanel({ risks }: { risks: Risk[] }) {
  return (
    <Card>
      <SectionHeading
        icon={<ShieldWarning weight="duotone" />}
        title="Team X-ray"
        aside={
          risks.length === 0 ? 'All clear' : `${risks.length} flag${risks.length === 1 ? '' : 's'}`
        }
      />
      {risks.length === 0 ? (
        <p className="text-[14px] text-ink-2">
          No open gaps, no single points of failure, and enough shared time to meet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {risks.map((r, i) => (
            <li key={`${r.type}-${r.requirementId ?? i}`} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-[7px] size-2 shrink-0 rounded-full',
                  r.severity === 'high' ? 'bg-danger' : 'bg-warning-ink',
                )}
              />
              <span className="text-[14px] leading-snug text-ink">{r.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
