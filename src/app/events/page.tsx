import Link from "next/link";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPool, listEvents, listProjectDetails } from "@/repo/queries";
import type { EventRow } from "@/lib/types";

const MODE_LABEL: Record<NonNullable<EventRow["mode"]>, string> = {
  online: "online",
  in_person: "in person",
  hybrid: "hybrid",
};

function closesOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** A closed competition is noise. Undated events keep their place at the back. */
function openEvents(events: EventRow[]): EventRow[] {
  const now = Date.now();
  return events
    .filter((e) => e.deadline_at === null || new Date(e.deadline_at).getTime() >= now)
    .sort((a, b) => {
      if (a.deadline_at === null) return b.deadline_at === null ? 0 : 1;
      if (b.deadline_at === null) return -1;
      return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
    });
}

export default async function EventsPage() {
  const [events, projects, pool] = await Promise.all([
    listEvents(),
    listProjectDetails(),
    getPool(),
  ]);

  const open = openEvents(events);

  const squadCount = new Map<string, number>();
  for (const p of projects) {
    if (p.event_id) squadCount.set(p.event_id, (squadCount.get(p.event_id) ?? 0) + 1);
  }
  const posterName = new Map(pool.map((p) => [p.id, p.name]));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Hackathons and competitions with squads forming. Soonest deadline first.
            </p>
          </div>
          <Button asChild variant="secondary" className="press-feedback">
            <Link href="/events/post">Post an event</Link>
          </Button>
        </div>

        {open.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Nothing open right now. Post the one you are running.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((e, i) => {
              const squads = squadCount.get(e.id) ?? 0;
              const poster = e.posted_by_profile_id
                ? posterName.get(e.posted_by_profile_id)
                : undefined;
              const meta = [e.host, e.mode ? MODE_LABEL[e.mode] : null, e.location].filter(
                Boolean,
              );
              return (
                <li
                  key={e.id}
                  style={
                    { "--rise-delay": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties
                  }
                  className="rise-in relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-hairline-strong hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {e.source === "organiser" ? (
                          <Badge variant="secondary" className="font-mono">
                            campus
                          </Badge>
                        ) : (
                          <span className="font-mono text-[11px] text-ink-tertiary">
                            {e.source}
                          </span>
                        )}
                        {poster && (
                          <span className="truncate text-xs text-muted-foreground">
                            posted by {poster}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/events/${e.id}`}
                        className="mt-2 block text-lg font-medium tracking-tight after:absolute after:inset-0"
                      >
                        {e.title}
                      </Link>
                      {meta.length > 0 && (
                        <div className="mt-1 truncate text-sm text-muted-foreground">
                          {meta.join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {e.deadline_at ? (
                        <span className="font-mono text-sm text-ink-muted tabular-nums">
                          closes {closesOn(e.deadline_at)}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-ink-tertiary">
                          no deadline
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-3">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {squads} {squads === 1 ? "squad" : "squads"} forming
                    </span>
                    {e.external_url && (
                      <a
                        href={e.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        Event site ↗
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
