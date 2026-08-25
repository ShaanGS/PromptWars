import Link from "next/link";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  gapFeed,
  scoreTeam,
  UNMET_THRESHOLD,
  type Member,
  type Requirement,
} from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import type { ProjectDetail } from "@/lib/types";
import { getMyProfile, getPool, listProjectDetails } from "@/repo/queries";

const FEED_LIMIT = 5;
const riseDelay = (i: number) => Math.min(i * 40, 320);

type Scored = {
  project: ProjectDetail;
  reqs: Requirement[];
  team: Member[];
  base: number;
  openSlots: Requirement[];
};

export default async function ProjectsPage() {
  const [projects, pool, me] = await Promise.all([
    listProjectDetails(),
    getPool(),
    getMyProfile(),
  ]);

  // The engine is pure and cheap, so coverage is computed on the server here —
  // the hub is a read-only view, no recompute loop to keep in the browser.
  const scored: Scored[] = projects.map((project) => {
    const reqs = project.requirements.map(toRequirement);
    const team = project.members.map(toMember);
    const ts = scoreTeam(team, reqs);
    const openSlots = reqs.filter(
      (r) =>
        (ts.coverage.find((c) => c.requirementId === r.id)?.coverage ?? 0) <
        UNMET_THRESHOLD,
    );
    return { project, reqs, team, base: ts.base, openSlots };
  });
  const byId = new Map(scored.map((s) => [s.project.id, s]));

  // The feed, flipped: not people like you, projects your stack completes.
  const feed = me
    ? gapFeed(
        toMember(me),
        scored.map((s) => ({ projectId: s.project.id, reqs: s.reqs, team: s.team })),
      ).slice(0, FEED_LIMIT)
    : [];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Squads</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{projects.length}</span> forming
              across a pool of{" "}
              <span className="font-mono tabular-nums">{pool.length}</span> people.
            </p>
          </div>
          <Button asChild className="press-feedback">
            <Link href="/projects/new">New squad</Link>
          </Button>
        </div>

        {me ? (
          <section aria-labelledby="feed-heading" className="mb-12">
            <h2 id="feed-heading" className="mb-1 text-sm font-medium">
              Squads looking for you
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Ranked by what you add to the team score, not by how well you match it.
            </p>
            {feed.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Nothing open needs your stack right now. Start one instead.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {feed.map((entry, i) => {
                  const s = byId.get(entry.projectId);
                  if (!s) return null;
                  const filled = s.reqs.find((r) => r.id === entry.gain.fills[0]);
                  return (
                    <li
                      key={entry.projectId}
                      className="rise-in"
                      style={
                        { "--rise-delay": `${riseDelay(i)}ms` } as React.CSSProperties
                      }
                    >
                      <Link
                        href={`/projects/${entry.projectId}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-hairline-strong hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-medium tracking-tight">
                              {s.project.title}
                            </span>
                            {s.project.event && (
                              <Badge variant="secondary">{s.project.event.title}</Badge>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {filled
                              ? `You fill ${filled.roleLabel ?? filled.skill}`
                              : "You deepen the roster"}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold text-primary tabular-nums">
                          +{(entry.gain.delta * 100).toFixed(1)}%
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className="mb-12">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-ink-muted">
                Create your profile to see squads that need you.
              </p>
              <Button asChild variant="secondary" className="press-feedback">
                <Link href="/onboarding">Create profile</Link>
              </Button>
            </div>
          </section>
        )}

        <section aria-labelledby="all-heading">
          <h2 id="all-heading" className="mb-4 text-sm font-medium">
            All squads
          </h2>
          {scored.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No squads yet. The first one sets the pace.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {scored.map((s, i) => (
                <li
                  key={s.project.id}
                  className="rise-in"
                  style={{ "--rise-delay": `${riseDelay(i)}ms` } as React.CSSProperties}
                >
                  <Link
                    href={`/projects/${s.project.id}`}
                    className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-hairline-strong hover:bg-surface-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {s.project.event && (
                          <Badge variant="secondary" className="mb-2">
                            {s.project.event.title}
                          </Badge>
                        )}
                        <div className="text-base font-medium tracking-tight">
                          {s.project.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono tabular-nums">
                            {s.project.members.length}
                          </span>{" "}
                          {s.project.members.length === 1 ? "member" : "members"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-lg font-semibold tabular-nums">
                          {Math.round(s.base * 100)}%
                        </div>
                        <div className="text-[11px] text-ink-tertiary">coverage</div>
                      </div>
                    </div>
                    {s.openSlots.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.openSlots.map((r) => (
                          <Badge
                            key={r.id}
                            variant="outline"
                            className="border-primary/40 text-primary"
                          >
                            {r.roleLabel ?? r.skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
