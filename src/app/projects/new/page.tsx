import Link from "next/link";
import { Nav } from "@/components/nav";
import { NewSquadForm } from "@/components/projects/new-squad-form";
import { listEvents } from "@/repo/queries";

/** An event stays selectable until the last date it carries has passed. */
function isUpcoming(e: {
  deadline_at: string | null;
  ends_at: string | null;
  starts_at: string | null;
}): boolean {
  const stamp = e.deadline_at ?? e.ends_at ?? e.starts_at;
  if (!stamp) return true;
  return new Date(stamp).getTime() >= Date.now();
}

export default async function NewSquadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [events, params] = await Promise.all([listEvents(), searchParams]);
  const options = events
    .filter(isUpcoming)
    .map((e) => ({ id: e.id, title: e.title }));

  // ?event=<id> is how an event page hands off to the builder. Anything that
  // isn't a live option falls back to "No event" rather than erroring.
  const requested = Array.isArray(params.event) ? params.event[0] : params.event;
  const initialEventId = options.some((o) => o.id === requested) ? requested : undefined;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-10">
          <Link
            href="/projects"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Squads
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">New squad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Name what you need. The requirements below become the open slots people
            rank against.
          </p>
        </div>
        <NewSquadForm events={options} initialEventId={initialEventId} />
      </main>
    </>
  );
}
