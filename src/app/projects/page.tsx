import Link from "next/link";
import { Plus, TrendingUp, Users } from "lucide-react";
import { AppShell, Page, PageHead } from "@/components/app-shell";
import { Avatar } from "@/components/brand";
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
const AVATAR_LIMIT = 4;
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
    <AppShell>
      <Page>
        <PageHead
          title="Squads"
          sub={`${projects.length} forming across a pool of ${pool.length} people.`}
          action={
            <Button asChild className="press rounded-full font-semibold">
              <Link href="/projects/new">
                <Plus className="size-4" strokeWidth={2.6} />
                New squad
              </Link>
            </Button>
          }
        />

        {me ? (
          <section aria-labelledby="feed-heading" className="mb-10">
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <h2 id="feed-heading" className="text-lg font-bold tracking-[-0.02em]">
                Squads looking for you
              </h2>
              <Link href="/people" className="text-sm font-semibold text-primary">
                See the pool
              </Link>
            </div>
            <p className="mb-4 text-sm text-ink-muted">
              Ranked by what you add to the team score, not by how well you match it.
            </p>
            {feed.length === 0 ? (
              <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
                <p className="text-sm text-ink-muted">
                  Nothing open needs your stack right now. Start one instead.
                </p>
                <Button
                  asChild
                  variant="secondary"
                  className="press rounded-full border border-border font-semibold"
                >
                  <Link href="/projects/new">New squad</Link>
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
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
                        className="g-card-interactive flex items-center gap-4 p-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold tracking-[-0.01em]">
                              {s.project.title}
                            </span>
                            {s.project.event && (
                              <span className="g-chip">{s.project.event.title}</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-ink-muted">
                            {filled
                              ? `You fill ${filled.roleLabel ?? filled.skill}`
                              : "You deepen the roster"}
                          </div>
                        </div>
                        <span className="g-figure flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                          <TrendingUp className="size-4" strokeWidth={2.4} />+
                          {(entry.gain.delta * 100).toFixed(1)}%
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className="mb-10">
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                Create your profile to see squads that need you.
              </p>
              <Button
                asChild
                variant="secondary"
                className="press rounded-full border border-border font-semibold"
              >
                <Link href="/onboarding">Create profile</Link>
              </Button>
            </div>
          </section>
        )}

        <section aria-labelledby="all-heading">
          <h2 id="all-heading" className="mb-3 text-lg font-bold tracking-[-0.02em]">
            All squads
          </h2>
          {scored.length === 0 ? (
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                No squads yet. Open the first one and name what you need.
              </p>
              <Button
                asChild
                variant="secondary"
                className="press rounded-full border border-border font-semibold"
              >
                <Link href="/projects/new">New squad</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {scored.map((s, i) => {
                const members = s.project.members;
                const shown = members.slice(0, AVATAR_LIMIT);
                return (
                  <li
                    key={s.project.id}
                    className="rise-in"
                    style={{ "--rise-delay": `${riseDelay(i)}ms` } as React.CSSProperties}
                  >
                    <Link
                      href={`/projects/${s.project.id}`}
                      className="g-card-interactive flex h-full flex-col gap-4 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {s.project.event && (
                            <span className="g-chip mb-2">{s.project.event.title}</span>
                          )}
                          <div className="font-semibold tracking-[-0.01em]">
                            {s.project.title}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="g-figure text-xl leading-none font-bold">
                            {Math.round(s.base * 100)}%
                          </div>
                          <div className="g-eyebrow mt-1 text-ink-subtle">coverage</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {members.length === 0 ? (
                          <span className="flex items-center gap-1.5 text-xs text-ink-subtle">
                            <Users className="size-4" strokeWidth={2.2} />
                            No members yet
                          </span>
                        ) : (
                          <>
                            <div className="flex -space-x-2">
                              {shown.map((m) => (
                                <Avatar
                                  key={m.id}
                                  name={m.name}
                                  className="size-8 text-[11px] ring-2 ring-card"
                                />
                              ))}
                            </div>
                            <span className="g-figure text-xs text-ink-muted">
                              {members.length}{" "}
                              {members.length === 1 ? "member" : "members"}
                            </span>
                          </>
                        )}
                      </div>

                      {s.openSlots.length > 0 && (
                        <div className="mt-auto flex flex-wrap gap-1.5">
                          {s.openSlots.map((r) => (
                            <span key={r.id} className="g-chip-accent">
                              {r.roleLabel ?? r.skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Page>
    </AppShell>
  );
}
