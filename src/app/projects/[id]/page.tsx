import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getPool, getProjectDetail } from "@/repo/queries";
import { toMember, toRequirement } from "@/lib/mappers";
import { AppShell, Page } from "@/components/app-shell";
import { Sandbox } from "@/components/sandbox/sandbox";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, pool] = await Promise.all([getProjectDetail(id), getPool()]);
  if (!project) notFound();

  return (
    <AppShell>
      <Page>
        <div className="mb-5 lg:mb-7">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.4} />
            Squads
          </Link>

          {project.event && (
            <Link
              href={`/events/${project.event.id}`}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <span className="g-chip-accent">{project.event.title}</span>
              {project.event.deadline_at && (
                <span className="g-chip">
                  <CalendarDays className="size-3.5" strokeWidth={2.2} />
                  closes{" "}
                  <span className="g-figure">
                    {new Date(project.event.deadline_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </span>
              )}
            </Link>
          )}

          <h1 className="mt-3 text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-balance sm:text-[32px]">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {project.description}
            </p>
          )}
        </div>

        <Sandbox
          pool={pool.map(toMember)}
          requirements={project.requirements.map(toRequirement)}
          initialTeamIds={project.members.map((m) => m.id)}
          ownerId={project.owner_profile_id}
        />
      </Page>
    </AppShell>
  );
}
