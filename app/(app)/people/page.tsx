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
    // role="main" rather than <main>: Page is the shared shell wrapper and is
    // shared with Olvable's screens, so the landmark is declared per page.
    <Page role="main">
      <PageHeader
        title="People"
        subtitle="Ranked by Guild Score: proof you can show, breadth of skill, and how short the open squads are of what you have."
      />

      {ranked.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<UsersThree aria-hidden="true" weight="duotone" />}
          title="Nobody here yet"
          body="Profiles appear as soon as people join the community."
        />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ profile, skills: claims, gs }) => {
            const meta = [profile.dept, profile.year ? `Year ${profile.year}` : null]
              .filter(Boolean)
              .join(' · ')
            const shown = claims.slice(0, SKILLS_SHOWN)
            const rest = claims.length - shown.length
            const score = Math.round(gs.total * 100)

            return (
              <li key={profile.id}>
                <Link
                  href={`/p/${profile.handle}`}
                  // Without this the link's name is the whole card read aloud,
                  // starting with a bare "78" before the words "Guild score".
                  aria-label={`${profile.name} — view profile`}
                  className="group flex h-full flex-col rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={profile.name} size={44} />
                    <div className="min-w-0 flex-1">
                      {/* h2, not h3: the page's only other heading is the h1 in
                        PageHeader, and h1 -> h3 is a broken outline. */}
                      <h2 className="truncate text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink underline-offset-2 group-hover:underline">
                        {profile.name}
                      </h2>
                      <p className="mt-1 truncate text-[13.5px] text-ink-2">
                        {meta || `@${profile.handle}`}
                      </p>
                    </div>
                    <div
                      role="meter"
                      aria-valuenow={score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Guild Score for ${profile.name}`}
                      className="shrink-0 text-right"
                    >
                      <p
                        aria-hidden="true"
                        className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink"
                      >
                        {score}
                      </p>
                      <p
                        aria-hidden="true"
                        className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3"
                      >
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
                          // The mint tint and the seal both say "verified"; the
                          // word says it too, so colour is never the only signal.
                          <Pill key={s.skill} tone="mint" size="sm">
                            <SealCheck aria-hidden="true" weight="fill" />
                            <span className="sr-only">Verified: </span>
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
                        <span className="sr-only"> more skills</span>
                      </Pill>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
