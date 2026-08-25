import Link from "next/link";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { AppShell, Page, PageHead } from "@/components/app-shell";
import { Avatar } from "@/components/brand";
import { SquadCard } from "@/components/squad-card";
import { StatTile } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { gapFeed, guildScore, scoreTeam, UNMET_THRESHOLD } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import type { EventRow, ProjectDetail, SkillRow } from "@/lib/types";
import { getMyProfile, getPool, listEvents, listProjectDetails } from "@/repo/queries";

const FEED_LIMIT = 4;
const EVENT_LIMIT = 3;
const FACE_LIMIT = 6;
const riseDelay = (i: number) => Math.min(i * 40, 320);

function closesOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The strongest thing a person actually listed — never a guess. */
function topSkill(skills: SkillRow[]): string | null {
  const best = [...skills].sort(
    (a, b) => Number(b.proficiency) - Number(a.proficiency) || (a.skill < b.skill ? -1 : 1),
  )[0];
  return best?.skill ?? null;
}

/** Only events still open, soonest first. Undated ones have nothing to count down. */
function stillOpen(events: EventRow[]): EventRow[] {
  const now = Date.now();
  return events
    .filter((e) => e.deadline_at !== null && new Date(e.deadline_at).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.deadline_at as string).getTime() -
        new Date(b.deadline_at as string).getTime(),
    );
}

/** A squad counts as open while any requirement sits under the coverage bar. */
function hasOpenSlot(project: ProjectDetail): boolean {
  const reqs = project.requirements.map(toRequirement);
  const ts = scoreTeam(project.members.map(toMember), reqs);
  return reqs.some(
    (r) =>
      (ts.coverage.find((c) => c.requirementId === r.id)?.coverage ?? 0) <
      UNMET_THRESHOLD,
  );
}

export default async function HomePage() {
  const [projects, pool, me, events] = await Promise.all([
    listProjectDetails(),
    getPool(),
    getMyProfile(),
    listEvents(),
  ]);

  // Same construction as the squads hub: the engine is pure, so the feed is
  // computed on the server and the cards read the project straight off it.
  const byId = new Map(projects.map((p) => [p.id, p]));

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

  const openNow = stillOpen(events);
  const upcoming = openNow.slice(0, EVENT_LIMIT);
  const faces = pool.slice(0, FACE_LIMIT);
  const openSquads = projects.filter(hasOpenSlot).length;

  // Same inputs as /people, so the number on the dashboard is the pool number.
  const myScore = me
    ? Math.round(
        guildScore(
          toMember(me),
          pool.map(toMember),
          projects.flatMap((p) => p.requirements.map(toRequirement)),
        ).total * 100,
      )
    : null;

  return (
    <AppShell>
      <Page>
        <PageHead
          title={me ? `Welcome back, ${me.name.split(" ")[0]}` : "Find your people at SRM"}
          sub={
            me
              ? `${projects.length} squads forming across a pool of ${pool.length} people.`
              : "Add your skills once, and squads with a matching gap surface here."
          }
          action={
            me ? (
              <Button asChild className="press rounded-xl font-semibold">
                <Link href="/projects/new">New squad</Link>
              </Button>
            ) : (
              <Button asChild className="press rounded-xl font-semibold">
                <Link href="/onboarding">Create profile</Link>
              </Button>
            )
          }
        />

        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile tone="sky" label="In the pool" value={pool.length} />
          <StatTile tone="lilac" label="Open squads" value={openSquads} />
          <StatTile tone="peach" label="Hackathons open" value={openNow.length} />
          {myScore !== null && (
            <StatTile tone="mint" label="Your Guild Score" value={myScore} />
          )}
        </div>

        <section aria-labelledby="feed-heading" className="mb-10">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="feed-heading" className="text-lg font-semibold tracking-[-0.02em]">
              Squads looking for you
            </h2>
            <Link href="/projects" className="text-sm font-semibold text-accent">
              See all
            </Link>
          </div>

          {!me ? (
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                Add your skills and squads that need them show up here.
              </p>
              <Button
                asChild
                variant="secondary"
                className="press rounded-xl border border-border font-semibold"
              >
                <Link href="/onboarding">Create profile</Link>
              </Button>
            </div>
          ) : feed.length === 0 ? (
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                Nothing open needs your stack right now. Start a squad instead.
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

        <section aria-labelledby="events-heading" className="mb-10">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="events-heading" className="text-lg font-semibold tracking-[-0.02em]">
              Closing soon
            </h2>
            <Link href="/events" className="text-sm font-semibold text-accent">
              See all
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                No deadlines ahead. Post the event you are running.
              </p>
              <Button
                asChild
                variant="secondary"
                className="press rounded-xl border border-border font-semibold"
              >
                <Link href="/events/post">Post an event</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {upcoming.map((e, i) => (
                <li
                  key={e.id}
                  className="rise-in"
                  style={{ "--rise-delay": `${riseDelay(i)}ms` } as React.CSSProperties}
                >
                  <Link
                    href={`/events/${e.id}`}
                    className="g-card-interactive flex h-full items-start gap-3 p-4"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                      <CalendarDays className="size-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold tracking-[-0.01em]">
                        {e.title}
                      </div>
                      <div className="g-figure mt-1 text-xs text-ink-muted">
                        closes {closesOn(e.deadline_at as string)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="pool-heading">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="pool-heading" className="text-lg font-semibold tracking-[-0.02em]">
              New faces in the pool
            </h2>
            <Link href="/people" className="text-sm font-semibold text-accent">
              See all
            </Link>
          </div>

          {faces.length === 0 ? (
            <div className="g-card flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-ink-muted">
                Nobody has joined yet. Add your profile to be the first.
              </p>
              <Button
                asChild
                variant="secondary"
                className="press rounded-xl border border-border font-semibold"
              >
                <Link href="/onboarding">Create profile</Link>
              </Button>
            </div>
          ) : (
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
              {faces.map((p, i) => {
                const skill = topSkill(p.skills);
                return (
                  <li
                    key={p.id}
                    className="rise-in w-32 shrink-0 snap-start sm:w-auto"
                    style={{ "--rise-delay": `${riseDelay(i)}ms` } as React.CSSProperties}
                  >
                    <Link
                      href={`/p/${p.handle}`}
                      className="g-card-interactive flex h-full flex-col items-center gap-2 p-4 text-center"
                    >
                      <Avatar name={p.name} className="size-11 text-sm" />
                      <span className="w-full truncate text-sm font-semibold">
                        {p.name}
                      </span>
                      <span className="w-full truncate text-xs text-ink-subtle">
                        {skill ?? p.dept}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/people"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
          >
            <Users className="size-4" strokeWidth={2.4} />
            Browse the whole pool
            <ArrowRight className="size-4" strokeWidth={2.4} />
          </Link>
        </section>
      </Page>
    </AppShell>
  );
}
