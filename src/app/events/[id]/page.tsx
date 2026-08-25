import Link from "next/link";
import { notFound } from "next/navigation";
import { scoreTeam, UNMET_THRESHOLD } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import type { EventRow, ProjectDetail } from "@/lib/types";
import { getEvent, getPool, listProjectDetails } from "@/repo/queries";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const MODE_LABEL: Record<NonNullable<EventRow["mode"]>, string> = {
  online: "online",
  in_person: "in person",
  hybrid: "hybrid",
};

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, projects, pool] = await Promise.all([
    getEvent(id),
    listProjectDetails(),
    getPool(),
  ]);
  if (!event) notFound();

  const squads = projects.filter((p) => p.event_id === id);
  const poster = event.posted_by_profile_id
    ? pool.find((p) => p.id === event.posted_by_profile_id)
    : undefined;

  const dates: { label: string; value: string }[] = [];
  if (event.starts_at) dates.push({ label: "Starts", value: fullDate(event.starts_at) });
  if (event.ends_at) dates.push({ label: "Ends", value: fullDate(event.ends_at) });
  if (event.deadline_at)
    dates.push({ label: "Closes", value: fullDate(event.deadline_at) });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link
          href="/events"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Events
        </Link>

        <header className="mt-4">
          <div className="flex items-center gap-2">
            {event.source === "organiser" ? (
              <Badge variant="secondary" className="font-mono">
                campus
              </Badge>
            ) : (
              <span className="font-mono text-[11px] text-ink-tertiary">
                {event.source}
              </span>
            )}
            {poster && (
              <span className="text-xs text-muted-foreground">posted by {poster.name}</span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            {event.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {[event.host, event.mode ? MODE_LABEL[event.mode] : null, event.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {event.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <Badge key={t} variant="outline" className="font-mono text-ink-muted">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {dates.length > 0 && (
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            {dates.map((d) => (
              <div key={d.label}>
                <dt className="text-[11px] tracking-[0.08em] text-ink-tertiary uppercase">
                  {d.label}
                </dt>
                <dd className="mt-0.5 font-mono text-sm tabular-nums">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="press-feedback">
            <Link href={`/projects/new?event=${event.id}`}>Create a squad request</Link>
          </Button>
          {event.external_url && (
            <Button asChild variant="secondary" className="press-feedback">
              <a href={event.external_url} target="_blank" rel="noreferrer">
                Event site ↗
              </a>
            </Button>
          )}
        </div>

        <Separator className="my-8" />

        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Squads forming</h2>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {squads.length}
          </span>
        </div>

        {squads.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No squads yet. Start the first one.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {squads.map((squad, i) => (
              <SquadCard key={squad.id} squad={squad} index={i} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function SquadCard({ squad, index }: { squad: ProjectDetail; index: number }) {
  // Same engine, same threshold as the sandbox — an open slot is a requirement
  // the current roster covers below 50%.
  const ts = scoreTeam(squad.members.map(toMember), squad.requirements.map(toRequirement));
  const openSlots = squad.requirements.filter((r) => {
    const entry = ts.coverage.find((c) => c.requirementId === r.id);
    return (entry?.coverage ?? 0) < UNMET_THRESHOLD;
  });

  return (
    <li
      style={{ "--rise-delay": `${Math.min(index * 40, 320)}ms` } as React.CSSProperties}
      className="rise-in relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-hairline-strong hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-4">
        <Link
          href={`/projects/${squad.id}`}
          className="text-base font-medium tracking-tight after:absolute after:inset-0"
        >
          {squad.title}
        </Link>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {squad.members.length} {squad.members.length === 1 ? "member" : "members"}
        </span>
      </div>
      {openSlots.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {openSlots.map((r) => (
            <Badge key={r.id} variant="outline" className="border-primary/40 text-primary">
              open · {r.role_label ?? r.skill}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Every slot covered.</p>
      )}
    </li>
  );
}
