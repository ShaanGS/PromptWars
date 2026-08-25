import { connection } from 'next/server'
import Link from 'next/link'
import { SealCheck, UsersThree } from '@phosphor-icons/react/dist/ssr'
import { guildScore } from '@/lib/engine'
import { createServiceClient } from '@/lib/supabase'
import {
  PROFILE_COLUMNS,
  REQUIREMENT_COLUMNS,
  SKILL_COLUMNS,
  groupSkills,
  toMember,
  toRequirement,
  type ProfileRow,
  type RequirementRow,
  type SkillRow,
} from '@/lib/team/mappers'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Avatar, EmptyState } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'

/** Skills past this many are folded into a "+N" pill so cards stay one height. */
const SKILLS_SHOWN = 4

/**
 * /people -- the directory, ordered by Guild Score.
 *
 * Deliberately not alphabetical and not "most connected". The engine's score
 * is credibility (claims you proved), versatility (breadth) and scarcity
 * (skills the open squads are short of), so the top of this list is the
 * person a squad forming right now would actually want. Every requirement in
 * the community is the demand side of that scarcity term, which is why the
 * page loads all of them before ranking anyone.
 */
export default async function PeoplePage() {
  await connection()
  const db = createServiceClient()

  const [profiles, skills, requirements] = await Promise.all([
    db.from('profiles').select(PROFILE_COLUMNS).order('name', { ascending: true }),
    db.from('skills').select(SKILL_COLUMNS),
    db.from('requirements').select(REQUIREMENT_COLUMNS),
  ])

  const profileRows = (profiles.data ?? []) as unknown as ProfileRow[]
  const skillRows = (skills.data ?? []) as unknown as SkillRow[]
  const openReqs = ((requirements.data ?? []) as unknown as RequirementRow[]).map(toRequirement)

  const byProfile = groupSkills(skillRows)
  const pool = profileRows.map((p) => toMember(p, byProfile.get(p.id) ?? []))

  const ranked = profileRows
    .map((profile, i) => ({
      profile,
      // Verified first, then strongest -- the pills double as the evidence.
      skills: [...(byProfile.get(profile.id) ?? [])].sort(
        (a, b) =>
          Number(Boolean(b.proof_url)) - Number(Boolean(a.proof_url)) ||
          Number(b.proficiency) - Number(a.proficiency) ||
          a.skill.localeCompare(b.skill),
      ),
      gs: guildScore(pool[i], pool, openReqs),
    }))
    .sort((a, b) => b.gs.total - a.gs.total || (a.profile.id < b.profile.id ? -1 : 1))

  return (
    <Page>
      <PageHeader
        title="People"
        subtitle="Ranked by Guild Score: proof you can show, breadth of skill, and how short the open squads are of what you have."
      />

      {ranked.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<UsersThree weight="duotone" />}
          title="Nobody here yet"
          body="Profiles appear as soon as people join the community."
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ profile, skills: claims, gs }) => {
            const meta = [profile.dept, profile.year ? `Year ${profile.year}` : null]
              .filter(Boolean)
              .join(' · ')
            const shown = claims.slice(0, SKILLS_SHOWN)
            const rest = claims.length - shown.length

            return (
              <Link
                key={profile.id}
                href={`/p/${profile.handle}`}
                className="group flex h-full flex-col rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={profile.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink underline-offset-2 group-hover:underline">
                      {profile.name}
                    </h3>
                    <p className="mt-1 truncate text-[13.5px] text-ink-2">
                      {meta || `@${profile.handle}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
                      {Math.round(gs.total * 100)}
                    </p>
                    <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
                      Guild score
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                  {shown.length === 0 ? (
                    <Pill tone="outline" size="sm">
                      No skills listed
                    </Pill>
                  ) : (
                    shown.map((s) =>
                      s.proof_url ? (
                        <Pill key={s.skill} tone="mint" size="sm">
                          <SealCheck weight="fill" />
                          {s.skill}
                        </Pill>
                      ) : (
                        <Pill key={s.skill} tone="neutral" size="sm">
                          {s.skill}
                        </Pill>
                      ),
                    )
                  )}
                  {rest > 0 ? (
                    <Pill tone="outline" size="sm">
                      +{rest}
                    </Pill>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Page>
  )
}
