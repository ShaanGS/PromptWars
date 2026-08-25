import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { guildScore } from "@/engine";
import { toMember, toRequirement } from "@/lib/mappers";
import { AppShell, Page, PageHead } from "@/components/app-shell";
import { Avatar } from "@/components/brand";
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
    <AppShell>
      <Page>
        <PageHead
          title="People"
          sub="Guild Score weighs proofs, breadth, and skills squads want but few have. Highest first."
        />

        {scored.length === 0 ? (
          <p className="g-card p-6 text-sm text-ink-muted">
            No profiles in the pool yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scored.map(({ profile, gs }, i) => (
              <Link
                key={profile.id}
                href={`/p/${profile.handle}`}
                style={
                  { "--rise-delay": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties
                }
                className="rise-in g-card-interactive flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={profile.name} className="size-11 text-sm" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{profile.name}</div>
                      <div className="truncate text-xs text-ink-muted">
                        {profile.dept}
                        {profile.year != null && (
                          <> {"·"} Year <span className="g-figure">{profile.year}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="g-figure text-3xl leading-none font-semibold">
                      {Math.round(gs.total * 100)}
                    </div>
                    <div className="g-eyebrow mt-1.5 text-ink-subtle">Guild score</div>
                  </div>
                </div>

                {profile.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {topSkills(profile.skills).map((s) => (
                      <span key={s.skill} className="g-chip">
                        {s.proof_url != null && (
                          <BadgeCheck className="size-3.5 text-success" />
                        )}
                        {s.skill}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </Page>
    </AppShell>
  );
}
