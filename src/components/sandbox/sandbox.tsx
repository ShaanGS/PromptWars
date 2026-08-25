"use client";

import { useMemo, useRef, useState } from "react";
import {
  autoDraft,
  rankCandidates,
  scoreTeam,
  teamRisks,
  UNMET_THRESHOLD,
  type Member,
  type Requirement,
  type Risk,
} from "@/engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Initials } from "@/components/nav";

type Props = {
  pool: Member[];
  requirements: Requirement[];
  initialTeamIds: string[];
  ownerId: string;
};

export function Sandbox({ pool, requirements, initialTeamIds, ownerId }: Props) {
  const [teamIds, setTeamIds] = useState<string[]>(initialTeamIds);
  const [drafting, setDrafting] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const byId = useMemo(() => new Map(pool.map((m) => [m.id, m])), [pool]);
  const team = teamIds.map((id) => byId.get(id)).filter(Boolean) as Member[];

  // The engine is pure and synchronous — every interaction recomputes the
  // full picture in well under a millisecond for a 40-person pool.
  const ts = scoreTeam(team, requirements);
  const ranked = rankCandidates(team, requirements, pool).slice(0, 12);
  const risks = teamRisks(team, requirements);

  const add = (id: string) => setTeamIds((t) => (t.includes(id) ? t : [...t, id]));
  const remove = (id: string) =>
    id === ownerId ? undefined : setTeamIds((t) => t.filter((x) => x !== id));

  // Auto-draft narrates the greedy algorithm: one pick lands every 450ms so
  // the coverage bar visibly climbs. Rare-action tier — the delight budget.
  const runAutoDraft = () => {
    if (drafting) return;
    const { picks } = autoDraft(pool, requirements, {
      start: team,
      maxSize: requirements.length + 1,
    });
    if (picks.length === 0) return;
    setDrafting(true);
    let i = 0;
    draftTimer.current = setInterval(() => {
      const pick = picks[i++];
      if (!pick) {
        if (draftTimer.current) clearInterval(draftTimer.current);
        setDrafting(false);
        return;
      }
      setTeamIds((t) => [...t, pick.member.id]);
    }, 450);
  };

  const reset = () => {
    if (draftTimer.current) clearInterval(draftTimer.current);
    setDrafting(false);
    setTeamIds(initialTeamIds);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <ScoreBar ts={ts} />
        <section aria-label="Requirement slots" className="flex flex-col gap-3">
          {requirements.map((req) => (
            <SlotCard
              key={req.id}
              req={req}
              ts={ts}
              team={team}
              ownerId={ownerId}
              onRemove={remove}
            />
          ))}
        </section>
        <RiskPanel risks={risks} />
      </div>

      <aside className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Ranked by marginal gain
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={runAutoDraft}
              disabled={drafting}
              className="press-feedback"
            >
              {drafting ? "Drafting…" : "Auto-draft"}
            </Button>
            <Button size="sm" variant="secondary" onClick={reset} className="press-feedback">
              Reset
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {ranked.map((gain, i) => {
            const c = byId.get(gain.candidateId)!;
            return (
              <CandidateRow
                key={c.id}
                candidate={c}
                delta={gain.delta}
                fills={gain.fills}
                duplicates={gain.duplicates}
                requirements={requirements}
                team={team}
                index={i}
                onAdd={() => add(c.id)}
              />
            );
          })}
          {ranked.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Everyone from the pool is on the team.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function ScoreBar({ ts }: { ts: ReturnType<typeof scoreTeam> }) {
  const pct = Math.round(ts.score * 100);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium">Team score</span>
        <span className="font-mono text-2xl font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-300 [transition-timing-function:var(--ease-out)]"
          style={{ transform: `scaleX(${ts.score})` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
        <Metric label="Coverage" value={ts.base} />
        <Metric label="Overlap" value={ts.overlap} />
        <Metric label="Balance" value={ts.balance} />
        <Metric label="Commitment" value={ts.commitment} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-sm text-foreground tabular-nums">
        {Math.round(value * 100)}%
      </div>
      {label}
    </div>
  );
}

function SlotCard({
  req,
  ts,
  team,
  ownerId,
  onRemove,
}: {
  req: Requirement;
  ts: ReturnType<typeof scoreTeam>;
  team: Member[];
  ownerId: string;
  onRemove: (id: string) => void;
}) {
  const entry = ts.coverage.find((c) => c.requirementId === req.id)!;
  const open = entry.coverage < UNMET_THRESHOLD;
  const label = req.roleLabel ?? req.skill;

  if (open) {
    // Empty slots are the loudest element on the page.
    return (
      <div className="gap-pulse rounded-xl border-2 border-dashed p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium tracking-[0.08em] text-primary uppercase">
              Open slot
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight">{label}</div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
              {req.skill} · weight {req.weight} · min {Math.round(req.minProficiency * 100)}%
            </div>
          </div>
          <div className="font-mono text-sm text-muted-foreground tabular-nums">
            {Math.round(entry.coverage * 100)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-base font-medium tracking-tight">{label}</div>
          <div className="font-mono text-xs text-muted-foreground">{req.skill}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full origin-left bg-success transition-transform duration-300 [transition-timing-function:var(--ease-out)]"
              style={{ transform: `scaleX(${entry.coverage})` }}
            />
          </div>
          <span className="font-mono text-sm tabular-nums">
            {Math.round(entry.coverage * 100)}%
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {entry.contributors.map((c) => {
          const m = team.find((x) => x.id === c.memberId)!;
          return (
            <span
              key={c.memberId}
              className="group flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pr-2 pl-1 text-sm"
            >
              <Initials name={m.name} />
              {m.name}
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(c.effective * 100)}%
              </span>
              {c.memberId !== ownerId && (
                <button
                  aria-label={`Remove ${m.name}`}
                  onClick={() => onRemove(c.memberId)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  delta,
  fills,
  duplicates,
  requirements,
  team,
  index,
  onAdd,
}: {
  candidate: Member;
  delta: number;
  fills: string[];
  duplicates: { requirementId: string; alreadyCoveredBy: string[] }[];
  requirements: Requirement[];
  team: Member[];
  index: number;
  onAdd: () => void;
}) {
  const labelOf = (id: string) => {
    const r = requirements.find((x) => x.id === id);
    return r?.roleLabel ?? r?.skill ?? id;
  };
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? "someone";
  const pct = (delta * 100).toFixed(1);
  const fillsGap = fills.length > 0;

  return (
    <button
      onClick={onAdd}
      style={{ "--rise-delay": `${Math.min(index * 40, 320)}ms` } as React.CSSProperties}
      className="rise-in group rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-hairline-strong hover:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Initials name={candidate.name} />
          <div>
            <div className="text-sm font-medium">{candidate.name}</div>
            <div className="text-xs text-muted-foreground">
              {candidate.skills
                .slice(0, 3)
                .map((s) => s.skill)
                .join(" · ")}
            </div>
          </div>
        </div>
        <span
          className={`font-mono text-sm font-semibold tabular-nums ${
            fillsGap ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {delta >= 0 ? "+" : ""}
          {pct}%
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {fills.map((id) => (
          <Badge key={id} variant="outline" className="border-primary/40 text-primary">
            fills {labelOf(id)}
          </Badge>
        ))}
        {duplicates.map((d) => (
          <Badge key={d.requirementId} variant="outline" className="text-muted-foreground">
            duplicates {labelOf(d.requirementId)} — {nameOf(d.alreadyCoveredBy[0])} has it
          </Badge>
        ))}
      </div>
    </button>
  );
}

function RiskPanel({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No structural risks. This roster survives a bad week.
      </div>
    );
  }
  return (
    <section aria-label="Team risks" className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">Team X-ray</h2>
      <ul className="flex flex-col gap-2">
        {risks.map((r, i) => (
          <li key={`${r.type}-${r.requirementId ?? i}`} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                r.severity === "high" ? "bg-destructive" : "bg-ink-tertiary"
              }`}
            />
            <span className="text-ink-muted">{r.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
