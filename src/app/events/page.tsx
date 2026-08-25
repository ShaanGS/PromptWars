import Link from "next/link";
import { ArrowUpRight, CalendarDays, Globe, MapPin, Users } from "lucide-react";
import { AppShell, Page, PageHead } from "@/components/app-shell";
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

/** Inside a week the date stops being reference material and becomes a warning. */
function closingSoon(iso: string): boolean {
  const ms = new Date(iso).getTime() - Date.now();
  return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000;
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
    <AppShell>
      <Page>
        <PageHead
          title="Events"
          sub="Hackathons and competitions with squads forming. Soonest deadline first."
          action={
            <Button
              asChild
              variant="secondary"
              className="press rounded-xl border border-border font-semibold"
            >
              <Link href="/events/post">Post an event</Link>
            </Button>
          }
        />

        {open.length === 0 ? (
          <div className="g-card p-6 text-sm text-ink-muted">
            Nothing is open right now — post the event you are running.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {open.map((e, i) => {
              const squads = squadCount.get(e.id) ?? 0;
              const poster = e.posted_by_profile_id
                ? posterName.get(e.posted_by_profile_id)
                : undefined;
              const meta = [e.host, e.mode ? MODE_LABEL[e.mode] : null, e.location].filter(
                Boolean,
              );
              const PlaceIcon = e.mode === "online" ? Globe : MapPin;
              const showPlaceIcon = e.mode !== null || e.location !== null;
              const soon = e.deadline_at !== null && closingSoon(e.deadline_at);

              return (
                <li
                  key={e.id}
                  style={
                    { "--rise-delay": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties
                  }
                  className="rise-in"
                >
                  <article className="g-card-interactive relative flex h-full flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.source === "organiser" ? (
                        <span className="g-chip-accent">campus</span>
                      ) : (
                        <span className="g-chip">{e.source}</span>
                      )}
                      {poster && (
                        <span className="min-w-0 truncate text-xs text-ink-subtle">
                          posted by {poster}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-[17px] leading-snug font-semibold tracking-[-0.01em]">
                      <Link href={`/events/${e.id}`} className="after:absolute after:inset-0">
                        {e.title}
                      </Link>
                    </h2>

                    {meta.length > 0 && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                        {showPlaceIcon && (
                          <PlaceIcon className="size-4 shrink-0" strokeWidth={2} />
                        )}
                        <span className="truncate">{meta.join(" · ")}</span>
                      </p>
                    )}

                    <div className="mt-4 mb-4">
                      {e.deadline_at ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            soon
                              ? "border-warn/20 bg-cream text-warn"
                              : "border-border bg-surface-2 text-ink-muted"
                          }`}
                        >
                          <CalendarDays className="size-4" strokeWidth={2} />
                          closes <span className="g-figure">{closesOn(e.deadline_at)}</span>
                        </span>
                      ) : (
                        <span className="g-chip">
                          <CalendarDays className="size-4" strokeWidth={2} />
                          no deadline
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3.5">
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Users className="size-4 shrink-0" strokeWidth={2} />
                        <span className="g-figure">{squads}</span>{" "}
                        {squads === 1 ? "squad" : "squads"} forming
                      </span>
                      {e.external_url && (
                        <a
                          href={e.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="relative z-10 flex items-center gap-1 text-xs font-medium text-ink-muted transition-colors hover:text-accent"
                        >
                          Event site
                          <ArrowUpRight className="size-4" strokeWidth={2} />
                        </a>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </Page>
    </AppShell>
  );
}
