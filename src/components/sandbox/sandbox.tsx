"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, RotateCcw, Sparkles, Plus, X } from "lucide-react";
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
import { Avatar } from "@/components/brand";
import { Button } from "@/components/ui/button";

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

  // The engine is pure and synchronous — a full recompute for a 40-person pool
  // costs well under a millisecond, so every interaction can just re-render.
  const ts = scoreTeam(team, requirements);
  const ranked = rankCandidates(team, requirements, pool).slice(0, 10);
  const risks = teamRisks(team, requirements);

  const add = (id: string) => setTeamIds((t) => (t.includes(id) ? t : [...t, id]));
  const remove = (id: string) =>
    id === ownerId ? undefined : setTeamIds((t) => t.filter((x) => x !== id));

  // Auto-draft narrates the greedy algorithm instead of jumping to the answer:
  // one pick lands every 420ms so the score visibly climbs. Rare action, so
  // this is where the delight budget goes.
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
    }, 420);
  };

  const reset = () => {
    if (draftTimer.current) clearInterval(draftTimer.current);
    setDrafting(false);
    setTeamIds(initialTeamIds);
  };

  const openCount = ts.coverage.filter((c) => c.coverage < UNMET_THRESHOLD).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex flex-col gap-5">
        <ScoreCard ts={ts} openCount={openCount} />

        <section aria-label="Requirement slots" className="flex flex-col gap-3">
          {requirements.map((req, i) => (
            <SlotCard
              key={req.id}
              req={req}
              ts={ts}
              team={team}
              ownerId={ownerId}
              index={i}
              onRemove={remove}
            />
          ))}
        </section>

        {/* Candidates sit here on mobile — right after the gaps they fill. */}
        <div className="lg:hidden">
          <CandidateList
            ranked={ranked}
            byId={byId}
            requirements={requirements}
            team={team}
            drafting={drafting}
            onAdd={add}
            onDraft={runAutoDraft}
            onReset={reset}
          />
        </div>

        <RiskPanel risks={risks} />
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <CandidateList
          ranked={ranked}
          byId={byId}
          requirements={requirements}
          team={team}
          drafting={drafting}
          onAdd={add}
          onDraft={runAutoDraft}
          onReset={reset}
        />
      </aside>
    </div>
  );
}

function ScoreCard({
  ts,
  openCount,
}: {
  ts: ReturnType<typeof scoreTeam>;
  openCount: number;
}) {
  return (
    <div className="g-card overflow-hidden">
      <div className="flex items-end justify-between gap-4 p-5 pb-4 sm:p-6 sm:pb-5">
        <div>
          <div className="g-eyebrow text-ink-subtle">Team score</div>
          <div className="g-figure mt-1 text-[44px] leading-none font-semibold sm:text-[52px]">
            {Math.round(ts.score * 100)}
            <span className="text-2xl text-ink-subtle">%</span>
          </div>
        </div>
        <p className="max-w-[46%] pb-2 text-right text-xs leading-snug text-ink-muted sm:text-sm">
          {openCount === 0
            ? "Every requirement is covered."
            : `${openCount} ${openCount === 1 ? "slot is" : "slots are"} still open.`}
        </p>
      </div>

      <div className="mx-5 h-2 overflow-hidden rounded-full bg-surface-3 sm:mx-6">
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-300"
          style={{
            transform: `scaleX(${ts.score})`,
            transitionTimingFunction: "var(--ease-out)",
          }}
        />
      </div>

      <div className="mt-5 grid grid-cols-4 divide-x divide-border border-t border-border">
        {[
          { label: "Coverage", v: ts.base },
          { label: "Overlap", v: ts.overlap },
          { label: "Balance", v: ts.balance },
          { label: "Commit", v: ts.commitment },
        ].map((m) => (
          <div key={m.label} className="px-2 py-3 text-center">
            <div className="g-figure text-sm font-semibold sm:text-base">
              {Math.round(m.v * 100)}%
            </div>
            <div className="mt-0.5 text-[11px] text-ink-subtle">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCard({
  req,
  ts,
  team,
  ownerId,
  index,
  onRemove,
}: {
  req: Requirement;
  ts: ReturnType<typeof scoreTeam>;
  team: Member[];
  ownerId: string;
  index: number;
  onRemove: (id: string) => void;
}) {
  const entry = ts.coverage.find((c) => c.requirementId === req.id)!;
  const open = entry.coverage < UNMET_THRESHOLD;
  const label = req.roleLabel ?? req.skill;
  const delay = { "--rise-delay": `${Math.min(index * 45, 320)}ms` } as React.CSSProperties;

  if (open) {
    return (
      <div
        style={delay}
        className="rise-in gap-pulse rounded-xl border-2 border-dashed p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="g-eyebrow text-accent">Open slot</div>
            <div className="mt-1 truncate text-lg font-semibold tracking-[-0.02em]">
              {label}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <span className="g-figure">{req.skill}</span>
              <span className="text-ink-subtle">·</span>
              <span>weight {req.weight}</span>
              <span className="text-ink-subtle">·</span>
              <span>
                needs <span className="g-figure">{Math.round(req.minProficiency * 100)}%</span>
              </span>
            </div>
          </div>
          <div className="g-figure shrink-0 text-lg font-semibold text-accent">
            {Math.round(entry.coverage * 100)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={delay} className="rise-in g-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-[-0.02em]">{label}</div>
          <div className="g-figure mt-0.5 text-xs text-ink-subtle">{req.skill}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:w-24">
            <div
              className="h-full origin-left rounded-full bg-success transition-transform duration-300"
              style={{
                transform: `scaleX(${entry.coverage})`,
                transitionTimingFunction: "var(--ease-out)",
              }}
            />
          </div>
          <span className="g-figure text-sm font-semibold">
            {Math.round(entry.coverage * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {entry.contributors.map((c) => {
          const m = team.find((x) => x.id === c.memberId)!;
          return (
            <span
              key={c.memberId}
              className="flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pr-1 pl-1"
            >
              <Avatar name={m.name} className="size-7 text-[10px]" />
              <span className="text-sm font-medium">{m.name}</span>
              <span className="g-figure text-xs text-ink-subtle">
                {Math.round(c.effective * 100)}%
              </span>
              {c.memberId !== ownerId ? (
                <button
                  aria-label={`Remove ${m.name}`}
                  onClick={() => onRemove(c.memberId)}
                  className="press flex size-6 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-3 hover:text-destructive"
                >
                  <X className="size-3.5" strokeWidth={2.6} />
                </button>
              ) : (
                <span className="pr-2 text-[10px] font-semibold text-ink-subtle">
                  OWNER
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
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
  ranked: ReturnType<typeof rankCandidates>;
  byId: Map<string, Member>;
  requirements: Requirement[];
  team: Member[];
  drafting: boolean;
  onAdd: (id: string) => void;
  onDraft: () => void;
  onReset: () => void;
}) {
  const labelOf = (id: string) => {
    const r = requirements.find((x) => x.id === id);
    return r?.roleLabel ?? r?.skill ?? id;
  };
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? "someone";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">Best next member</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onDraft}
            disabled={drafting}
            className="press rounded-xl font-semibold"
          >
            <Sparkles className="size-3.5" strokeWidth={2.4} />
            {drafting ? "Drafting" : "Auto-draft"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onReset}
            aria-label="Reset roster"
            className="press rounded-xl border border-border"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.4} />
          </Button>
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="g-card p-4 text-sm text-ink-muted">
          Everyone in the pool is already on this team.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ranked.map((gain, i) => {
            const c = byId.get(gain.candidateId)!;
            const fillsGap = gain.fills.length > 0;
            return (
              <button
                key={c.id}
                onClick={() => onAdd(c.id)}
                style={
                  { "--rise-delay": `${Math.min(i * 35, 300)}ms` } as React.CSSProperties
                }
                className="rise-in g-card-interactive group p-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} className="size-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="truncate text-xs text-ink-subtle">
                      {c.skills.slice(0, 3).map((s) => s.skill).join(" · ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`g-figure text-sm font-semibold ${
                        fillsGap ? "text-accent" : "text-ink-subtle"
                      }`}
                    >
                      +{(gain.delta * 100).toFixed(1)}%
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                      <Plus className="size-3.5" strokeWidth={2.8} />
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {gain.fills.map((id) => (
                    <span key={id} className="g-chip-accent">
                      fills {labelOf(id)}
                    </span>
                  ))}
                  {gain.duplicates.map((d) => (
                    <span key={d.requirementId} className="g-chip">
                      {nameOf(d.alreadyCoveredBy[0])} already covers{" "}
                      {labelOf(d.requirementId)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiskPanel({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) {
    return (
      <div className="g-card flex items-center gap-3 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
          <Sparkles className="size-4" strokeWidth={2.2} />
        </span>
        <p className="text-sm text-ink-muted">
          No structural risks. This roster survives a bad week.
        </p>
      </div>
    );
  }
  return (
    <section aria-label="Team risks" className="g-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="size-4 text-warn" strokeWidth={2.2} />
        <h2 className="text-sm font-semibold tracking-[-0.01em]">Team X-ray</h2>
        <span className="g-figure ml-auto text-xs text-ink-subtle">{risks.length}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {risks.map((r, i) => (
          <li
            key={`${r.type}-${r.requirementId ?? i}`}
            className="flex items-start gap-2.5 text-sm"
          >
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                r.severity === "high" ? "bg-destructive" : "bg-warn"
              }`}
            />
            <span className="leading-snug text-ink-muted">{r.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
