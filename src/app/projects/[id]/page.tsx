import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool, getProjectDetail } from "@/repo/queries";
import { toMember, toRequirement } from "@/lib/mappers";
import { Nav } from "@/components/nav";
import { Sandbox } from "@/components/sandbox/sandbox";
import { Badge } from "@/components/ui/badge";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, pool] = await Promise.all([getProjectDetail(id), getPool()]);
  if (!project) notFound();

  const members = pool.map(toMember);
  const requirements = project.requirements.map(toRequirement);
  const initialTeamIds = project.members.map((m) => m.id);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          {project.event && (
            <Link
              href={`/events/${project.event.id}`}
              className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Badge variant="secondary">{project.event.title}</Badge>
              {project.event.deadline_at && (
                <span>
                  closes {new Date(project.event.deadline_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
        <Sandbox
          pool={members}
          requirements={requirements}
          initialTeamIds={initialTeamIds}
          ownerId={project.owner_profile_id}
        />
      </main>
    </>
  );
}
