import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { scoreTeam, UNMET_THRESHOLD } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import type { ProjectDetail } from "@/lib/types";
import { Avatar, Pill, ScoreBand, coverageBand } from "@/components/ui/bits";
import { cn } from "@/lib/utils";

/**
 * The squad card, built on the Olvable card: one title, one meta line, a few
 * pills, then the actions. A column of them on a phone should read like a
 * feed, not a table.
 *
 * The gap chips are the point of the card — a squad is worth opening because
 * of what it is missing, so the missing roles get the accent and the filled
 * ones are never listed.
 */
export function SquadCard({
  project,
  gain,
  index = 0,
}: {
  project: ProjectDetail;
  /** Present on the feed: what this squad gains by adding the viewer. */
  gain?: { delta: number; fills: string[] };
  index?: number;
}) {
  const reqs = project.requirements.map(toRequirement);
  const ts = scoreTeam(project.members.map(toMember), reqs);
  const open = reqs.filter(
    (r) =>
      (ts.coverage.find((c) => c.requirementId === r.id)?.coverage ?? 0) <
      UNMET_THRESHOLD,
  );
  const pct = Math.round(ts.base * 100);
  const band = coverageBand(pct);
  const filled = gain ? reqs.find((r) => r.id === gain.fills[0]) : undefined;

  return (
    <article
      style={{ "--rise-delay": `${Math.min(index * 40, 320)}ms` } as React.CSSProperties}
      className={cn(
        "rise-in group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition-colors",
        gain ? "border-accent/40" : "border-border hover:border-line-strong",
      )}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          {project.event ? (
            <Pill tone="lilac" size="sm" className="max-w-[70%]">
              <span className="truncate">{project.event.title}</span>
            </Pill>
          ) : (
            <Pill tone="neutral" size="sm">
              Project
            </Pill>
          )}
          <ScoreBand label={band.label} value={pct} dot={band.dot} />
        </div>

        <h3 className="line-clamp-2 text-[16.5px] leading-snug font-semibold tracking-[-0.01em]">
          <Link
            href={`/projects/${project.id}`}
            className="underline-offset-2 hover:underline"
          >
            {project.title}
          </Link>
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-ink-muted">
          <Users className="size-4 shrink-0" strokeWidth={1.9} />
          <span className="font-mono tabular-nums">{project.members.length}</span>
          {project.members.length === 1 ? "member" : "members"}
          {project.deadline && (
            <>
              <span className="text-ink-subtle">·</span>
              <CalendarDays className="size-4 shrink-0" strokeWidth={1.9} />
              <span className="font-mono tabular-nums">
                {new Date(project.deadline).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </>
          )}
        </p>

        {gain && (
          <p className="mt-2.5 text-[13.5px]">
            <span className="font-mono font-semibold text-accent tabular-nums">
              +{(gain.delta * 100).toFixed(1)}%
            </span>{" "}
            <span className="text-ink-muted">
              {filled
                ? `if you take ${filled.roleLabel ?? filled.skill}`
                : "if you join"}
            </span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {open.length > 0 ? (
            <>
              <span className="text-[12.5px] text-ink-muted">Needs</span>
              {open.slice(0, 3).map((r) => (
                <Pill key={r.id} tone="accent-soft" size="sm">
                  {r.roleLabel ?? r.skill}
                </Pill>
              ))}
              {open.length > 3 && (
                <span className="font-mono text-[12.5px] text-ink-subtle tabular-nums">
                  +{open.length - 3}
                </span>
              )}
            </>
          ) : (
            <Pill tone="success" size="sm">
              Every slot covered
            </Pill>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex -space-x-2">
            {project.members.slice(0, 4).map((m) => (
              <Avatar
                key={m.id}
                name={m.name}
                size={28}
                className="ring-2 ring-card"
              />
            ))}
            {project.members.length > 4 && (
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface-2 font-mono text-[11px] font-medium text-ink-muted ring-2 ring-card tabular-nums">
                +{project.members.length - 4}
              </span>
            )}
          </div>
          <Link
            href={`/projects/${project.id}`}
            className="press inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-4 text-[13.5px] font-medium text-background"
          >
            Open
            <ArrowUpRight className="size-3.5" strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** The event card's meta line uses the same shape, so it lives here too. */
export function MetaLine({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-[13.5px] text-ink-muted">
      <span className="shrink-0 [&_svg]:size-4">{icon}</span>
      <span className="truncate">{children}</span>
    </p>
  );
}

export { MapPin };
