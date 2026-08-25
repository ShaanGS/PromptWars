import Link from "next/link";
import { guildScore } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import { Initials, Nav } from "@/components/nav";
import { getPool, listProjectDetails } from "@/repo/queries";
import type { SkillRow } from "@/lib/types";

function topSkills(skills: SkillRow[], limit = 4): SkillRow[] {
  return [...skills]
    .sort(
      (a, b) =>
        Number(b.proficiency) - Number(a.proficiency) ||
        (a.skill < b.skill ? -1 : 1),
    )
    .slice(0, limit);
}

export default async function PeoplePage() {
  const [pool, projects] = await Promise.all([getPool(), listProjectDetails()]);
  const members = pool.map(toMember);
  const openReqs = projects.flatMap((p) => p.requirements.map(toRequirement));

  const scored = pool
    .map((profile) => ({
      profile,
      gs: guildScore(toMember(profile), members, openReqs),
    }))
    .sort(
      (a, b) => b.gs.total - a.gs.total || (a.profile.id < b.profile.id ? -1 : 1),
    );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guild Score ={" "}
            <span className="font-mono tabular-nums">
              0.40·credibility + 0.25·versatility + 0.35·scarcity
            </span>{" "}
            — proofs, breadth, and skills squads want but few have.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scored.map(({ profile, gs }, i) => (
            <Link
              key={profile.id}
              href={`/p/${profile.handle}`}
              style={
                { "--rise-delay": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties
              }
              className="rise-in rounded-xl border border-border bg-card p-5 transition-colors hover:border-hairline-strong hover:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Initials name={profile.name} />
                  <div>
                    <div className="text-sm font-medium">{profile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {profile.dept}
                      {profile.year != null && (
                        <>
                          {" · "}
                          <span className="font-mono tabular-nums">Y{profile.year}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl leading-none font-semibold tabular-nums">
                    {Math.round(gs.total * 100)}
                  </div>
                  <div className="mt-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                    Guild Score
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {topSkills(profile.skills).map((s) => (
                  <span
                    key={s.skill}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-ink-muted"
                  >
                    {s.proof_url != null && <span className="text-success">✓</span>}
                    {s.skill}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {scored.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No profiles in the pool yet.
          </p>
        )}
      </main>
    </>
  );
}
