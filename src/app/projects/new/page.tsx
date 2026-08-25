import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, Page, PageHead } from "@/components/app-shell";
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
    <AppShell>
      <Page>
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/projects"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={2.4} />
            Squads
          </Link>
          <PageHead
            title="New squad"
            sub="Name what you need. The requirements below become the open slots people rank against."
          />
          <NewSquadForm events={options} initialEventId={initialEventId} />
        </div>
      </Page>
    </AppShell>
  );
}
