import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell, Page, PageHead } from "@/components/app-shell";
import { SquadCard } from "@/components/squad-card";
import { Button } from "@/components/ui/button";
import { gapFeed } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import { getMyProfile, getPool, listProjectDetails } from "@/repo/queries";

const FEED_LIMIT = 5;

export default async function ProjectsPage() {
  const [projects, pool, me] = await Promise.all([
    listProjectDetails(),
    getPool(),
    getMyProfile(),
  ]);

  const byId = new Map(projects.map((p) => [p.id, p]));

  // The feed, flipped: not people like you, projects your stack completes.
  const feed = me
    ? gapFeed(
        toMember(me),
        projects.map((p) => ({
          projectId: p.id,
          reqs: p.requirements.map(toRequirement),
          team: p.members.map(toMember),
        })),
      ).slice(0, FEED_LIMIT)
    : [];

  return (
    <AppShell>
      <Page>
        <PageHead
          title="Squads"
          sub={`${projects.length} forming across a pool of ${pool.length} people.`}
          action={
            <Button asChild className="press rounded-xl font-semibold">
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
              <h2 id="feed-heading" className="text-lg font-semibold tracking-[-0.02em]">
                Squads looking for you
              </h2>
              <Link href="/people" className="text-sm font-semibold text-accent">
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
                  className="press rounded-xl border border-border font-semibold"
                >
                  <Link href="/projects/new">New squad</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {feed.map((entry, i) => {
                  const p = byId.get(entry.projectId);
                  if (!p) return null;
                  return (
                    <SquadCard
                      key={entry.projectId}
                      project={p}
                      gain={{ delta: entry.gain.delta, fills: entry.gain.fills }}
                      index={i}
                    />
                  );
                })}
              </div>
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
                className="press rounded-xl border border-border font-semibold"
              >
                <Link href="/onboarding">Create profile</Link>
              </Button>
            </div>
          </section>
        )}

        <section aria-labelledby="all-heading">
          <h2 id="all-heading" className="mb-3 text-lg font-semibold tracking-[-0.02em]">
            All squads
          </h2>
          {projects.length === 0 ? (
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                No squads yet. Open the first one and name what you need.
              </p>
              <Button
                asChild
                variant="secondary"
                className="press rounded-xl border border-border font-semibold"
              >
                <Link href="/projects/new">New squad</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((p, i) => (
                <SquadCard key={p.id} project={p} index={i} />
              ))}
            </div>
          )}
        </section>
      </Page>
    </AppShell>
  );
}
