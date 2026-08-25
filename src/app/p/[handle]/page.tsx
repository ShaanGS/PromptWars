import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Sparkles, TrendingUp } from "lucide-react";
import { gapFeed, guildScore, peopleYouShouldMeet } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import { AppShell, Page, PageHead } from "@/components/app-shell";
import { Avatar } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getPool, getProfileByHandle, listProjectDetails } from "@/repo/queries";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [profile, pool, projects] = await Promise.all([
    getProfileByHandle(handle),
    getPool(),
    listProjectDetails(),
  ]);
  if (!profile) notFound();

  const me = toMember(profile);
  const members = pool.map(toMember);
  const openReqs = projects.flatMap((p) => p.requirements.map(toRequirement));

  const gs = guildScore(me, members, openReqs);
  const meet = peopleYouShouldMeet(me, members, 3);
  const feed = gapFeed(
    me,
    projects.map((p) => ({
      projectId: p.id,
      reqs: p.requirements.map(toRequirement),
      team: p.members.map(toMember),
    })),
  ).slice(0, 3);

  const profileById = new Map(pool.map((p) => [p.id, p]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const skills = [...profile.skills].sort(
    (a, b) =>
      Number(b.proficiency) - Number(a.proficiency) || (a.skill < b.skill ? -1 : 1),
  );

  return (
    <AppShell>
      <Page>
        <PageHead
          title="Profile"
          action={
            <Button
              asChild
              variant="secondary"
              className="press rounded-full border border-border font-semibold"
            >
              <Link href="/people">All people</Link>
            </Button>
          }
        />

        <div className="flex flex-col gap-4">
          <section className="g-card rise-in flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-5 sm:p-8">
            <Avatar name={profile.name} className="size-16 text-lg" />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-[-0.03em]">{profile.name}</h2>
              <div className="mt-1 text-sm text-ink-muted">
                <span className="g-figure">@{profile.handle}</span>
                {" · "}
                {profile.dept}
                {profile.year != null && (
                  <> {"·"} Year <span className="g-figure">{profile.year}</span></>
                )}
              </div>
              {profile.bio && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                  {profile.bio}
                </p>
              )}
            </div>
          </section>

          <section
            aria-label="Guild Score"
            style={{ "--rise-delay": "40ms" } as React.CSSProperties}
            className="g-card rise-in p-6 sm:p-8"
          >
            <div className="grid gap-6 sm:grid-cols-[160px_1fr] sm:gap-8">
              <div>
                <div className="g-eyebrow text-ink-subtle">Guild score</div>
                <div className="g-figure mt-2 text-6xl leading-none font-semibold text-primary">
                  {Math.round(gs.total * 100)}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
                  Out of 100, recomputed from the pool.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <BreakdownBar label="Credibility" value={gs.credibility} />
                <BreakdownBar label="Versatility" value={gs.versatility} />
                <BreakdownBar label="Scarcity" value={gs.scarcity} />

                {gs.rareSkills.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-1.5 border-t border-border pt-4 text-sm text-ink-muted">
                    {gs.rareSkills.map((r) => (
                      <li key={r.skill}>
                        <span className="font-medium text-foreground">{r.skill}</span>
                        {" is wanted by "}
                        <span className="g-figure">{r.demand}</span>{" "}
                        {r.demand === 1 ? "squad" : "squads"} and held by{" "}
                        <span className="g-figure">{r.supply}</span>{" "}
                        {r.supply === 1 ? "person" : "people"}.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section
              aria-label="Skills"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
              className="g-card rise-in p-6"
            >
              <h2 className="font-semibold">Skills</h2>
              <p className="mt-0.5 text-xs text-ink-subtle">
                Proficiency as claimed, damped without proof.
              </p>
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {skills.map((s) => (
                  <li
                    key={s.skill}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {s.proof_url != null && (
                          <BadgeCheck className="size-4 shrink-0 text-success" />
                        )}
                        <span className="truncate">{s.skill}</span>
                      </div>
                      {s.proof_url != null ? (
                        <a
                          href={s.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-success hover:underline"
                        >
                          proof
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      ) : (
                        <div className="mt-0.5 text-xs text-ink-subtle">
                          unverified — counts 0.6×
                        </div>
                      )}
                    </div>
                    <span className="g-figure shrink-0 text-sm font-semibold">
                      {Math.round(Number(s.proficiency) * 100)}%
                    </span>
                  </li>
                ))}
                {skills.length === 0 && (
                  <li className="text-sm text-ink-muted">No skills listed.</li>
                )}
              </ul>
            </section>

            <div className="flex flex-col gap-4">
              <section
                aria-label="People you should meet"
                style={{ "--rise-delay": "120ms" } as React.CSSProperties}
                className="g-card rise-in p-6"
              >
                <h2 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  People you should meet
                </h2>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  Ranked by complementarity, not similarity.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {meet.map(({ member, comp }) => {
                    const p = profileById.get(member.id);
                    if (!p) return null;
                    const brings = comp.bFills.slice(0, 3);
                    return (
                      <Link
                        key={member.id}
                        href={`/p/${p.handle}`}
                        className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 transition-colors duration-150 hover:bg-surface-3"
                      >
                        <Avatar name={member.name} className="size-11 text-sm" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {member.name}
                          </div>
                          <div className="truncate text-xs text-ink-muted">
                            {brings.length > 0
                              ? `brings ${brings.join(", ")} you don't have`
                              : "similar stack — no new skills"}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {meet.length === 0 && (
                    <p className="text-sm text-ink-muted">No one else in the pool yet.</p>
                  )}
                </div>
              </section>

              {feed.length > 0 && (
                <section
                  aria-label="Squads that need you"
                  style={{ "--rise-delay": "160ms" } as React.CSSProperties}
                  className="g-card rise-in p-6"
                >
                  <h2 className="flex items-center gap-2 font-semibold">
                    <TrendingUp className="size-4 text-primary" />
                    Squads that need you
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    Open squads ranked by your marginal gain.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {feed.map(({ projectId, gain }) => {
                      const project = projectById.get(projectId);
                      if (!project) return null;
                      const req = project.requirements.find(
                        (r) => r.id === gain.fills[0],
                      );
                      return (
                        <Link
                          key={projectId}
                          href={`/projects/${projectId}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 transition-colors duration-150 hover:bg-surface-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {project.title}
                            </div>
                            {req && (
                              <div className="truncate text-xs text-ink-muted">
                                fills {req.role_label ?? req.skill}
                              </div>
                            )}
                          </div>
                          <span className="g-figure shrink-0 text-sm font-semibold text-primary">
                            +{(gain.delta * 100).toFixed(1)}%
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </Page>
    </AppShell>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink-muted">{label}</span>
        <span className="g-figure font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
