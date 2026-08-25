import Link from "next/link";
import { notFound } from "next/navigation";
import { gapFeed, guildScore, peopleYouShouldMeet } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import { Initials, Nav } from "@/components/nav";
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
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-8 flex items-start gap-4">
          <Initials name={profile.name} className="size-14! text-lg!" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
            <div className="mt-0.5 text-sm text-muted-foreground">
              <span className="font-mono">@{profile.handle}</span>
              {" · "}
              {profile.dept}
              {profile.year != null && (
                <>
                  {" · "}
                  <span className="font-mono tabular-nums">Y{profile.year}</span>
                </>
              )}
            </div>
            {profile.bio && (
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">{profile.bio}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <section
            aria-label="Guild Score"
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="grid gap-6 sm:grid-cols-[140px_1fr]">
              <div>
                <div className="text-sm font-medium">Guild Score</div>
                <div className="mt-2 font-mono text-5xl leading-none font-semibold text-primary tabular-nums">
                  {Math.round(gs.total * 100)}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <BreakdownBar label="Credibility" value={gs.credibility} />
                <BreakdownBar label="Versatility" value={gs.versatility} />
                <BreakdownBar label="Scarcity" value={gs.scarcity} />
                {gs.rareSkills.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
                    {gs.rareSkills.map((r) => (
                      <li key={r.skill}>
                        <span className="font-mono text-ink-muted">{r.skill}</span>
                        {" — wanted by "}
                        <span className="font-mono tabular-nums">{r.demand}</span>{" "}
                        {r.demand === 1 ? "squad" : "squads"},{" "}
                        <span className="font-mono tabular-nums">{r.supply}</span>{" "}
                        {r.supply === 1 ? "person has" : "people have"} it
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section
              aria-label="Skills"
              className="rounded-xl border border-border bg-card p-5"
            >
              <h2 className="mb-3 text-sm font-medium">Skills</h2>
              <ul className="flex flex-col gap-2.5">
                {skills.map((s) => (
                  <li
                    key={s.skill}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-1.5">
                      {s.proof_url != null && <span className="text-success">✓</span>}
                      {s.skill}
                    </span>
                    <span className="flex items-center gap-3">
                      {s.proof_url != null ? (
                        <a
                          href={s.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          proof ↗
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          unverified · counts 0.6×
                        </span>
                      )}
                      <span className="font-mono tabular-nums">
                        {Math.round(Number(s.proficiency) * 100)}%
                      </span>
                    </span>
                  </li>
                ))}
                {skills.length === 0 && (
                  <li className="text-sm text-muted-foreground">No skills listed.</li>
                )}
              </ul>
            </section>

            <div className="flex flex-col gap-6">
              <section
                aria-label="People you should meet"
                className="rounded-xl border border-border bg-card p-5"
              >
                <h2 className="text-sm font-medium">People you should meet</h2>
                <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                  Ranked by complementarity, not similarity.
                </p>
                <div className="flex flex-col gap-2">
                  {meet.map(({ member, comp }, i) => {
                    const p = profileById.get(member.id);
                    if (!p) return null;
                    const brings = comp.bFills.slice(0, 3);
                    return (
                      <Link
                        key={member.id}
                        href={`/p/${p.handle}`}
                        style={
                          {
                            "--rise-delay": `${Math.min(i * 40, 320)}ms`,
                          } as React.CSSProperties
                        }
                        className="rise-in flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors hover:border-hairline-strong hover:bg-surface-3"
                      >
                        <Initials name={member.name} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {brings.length > 0 ? (
                              <>
                                brings{" "}
                                <span className="font-mono">{brings.join(", ")}</span>{" "}
                                you don&apos;t have
                              </>
                            ) : (
                              "similar stack — no new skills"
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {meet.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No one else in the pool yet.
                    </p>
                  )}
                </div>
              </section>

              {feed.length > 0 && (
                <section
                  aria-label="Squads that need you"
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <h2 className="text-sm font-medium">Squads that need you</h2>
                  <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                    Open squads ranked by your marginal gain.
                  </p>
                  <div className="flex flex-col gap-2">
                    {feed.map(({ projectId, gain }, i) => {
                      const project = projectById.get(projectId);
                      if (!project) return null;
                      const req = project.requirements.find(
                        (r) => r.id === gain.fills[0],
                      );
                      return (
                        <Link
                          key={projectId}
                          href={`/projects/${projectId}`}
                          style={
                            {
                              "--rise-delay": `${Math.min(i * 40, 320)}ms`,
                            } as React.CSSProperties
                          }
                          className="rise-in flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors hover:border-hairline-strong hover:bg-surface-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {project.title}
                            </div>
                            {req && (
                              <div className="text-xs text-muted-foreground">
                                fills {req.role_label ?? req.skill}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 font-mono text-sm font-semibold text-primary tabular-nums">
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
      </main>
    </>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
