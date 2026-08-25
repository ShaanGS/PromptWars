import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Globe, MapPin } from "lucide-react";
import type { EventRow } from "@/lib/types";
import { getEvent, getPool, listProjectDetails } from "@/repo/queries";
import { AppShell, Page } from "@/components/app-shell";
import { SquadCard } from "@/components/squad-card";
import { Button } from "@/components/ui/button";

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

  const meta = [event.host, event.mode ? MODE_LABEL[event.mode] : null, event.location]
    .filter(Boolean)
    .join(" · ");
  const PlaceIcon = event.mode === "online" ? Globe : MapPin;
  const showPlaceIcon = event.mode !== null || event.location !== null;

  return (
    <AppShell>
      <Page>
        <Link
          href="/events"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Events
        </Link>

        <header className="g-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {event.source === "organiser" ? (
              <span className="g-chip-accent">campus</span>
            ) : (
              <span className="g-chip">{event.source}</span>
            )}
            {poster && (
              <span className="text-xs text-ink-subtle">posted by {poster.name}</span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-3xl">
            {event.title}
          </h1>

          {meta && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
              {showPlaceIcon && <PlaceIcon className="size-4 shrink-0" strokeWidth={2} />}
              {meta}
            </p>
          )}

          {event.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <span key={t} className="g-chip">
                  {t}
                </span>
              ))}
            </div>
          )}

          {dates.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-5">
              {dates.map((d) => (
                <div key={d.label}>
                  <dt className="g-eyebrow text-ink-subtle">{d.label}</dt>
                  <dd className="g-figure mt-1 text-sm text-foreground">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="press h-11 rounded-xl font-semibold">
              <Link href={`/projects/new?event=${event.id}`}>Create a squad request</Link>
            </Button>
            {event.external_url && (
              <Button
                asChild
                variant="secondary"
                className="press h-11 rounded-xl border border-border font-semibold"
              >
                <a href={event.external_url} target="_blank" rel="noreferrer">
                  Event site
                  <ArrowUpRight className="size-4" strokeWidth={2} />
                </a>
              </Button>
            )}
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Squads forming</h2>
            <span className="g-figure text-sm text-ink-muted">{squads.length}</span>
          </div>

          {squads.length === 0 ? (
            <div className="g-card p-6 text-sm text-ink-muted">
              No squads yet — create the first request and people can join it.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {squads.map((squad, i) => (
                <SquadCard key={squad.id} project={squad} index={i} />
              ))}
            </div>
          )}
        </section>
      </Page>
    </AppShell>
  );
}
