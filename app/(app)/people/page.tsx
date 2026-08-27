import { connection } from 'next/server'
import { UsersThree } from '@phosphor-icons/react/dist/ssr'
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
import { EmptyState } from '@/components/ui/bits'
import { PersonCard } from '@/components/team/person-card'

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
        subtitle="Ranked by Guild Score: proof you can show, breadth of skill, and how many open teams need what you have."
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
          {ranked.map(({ profile, skills: claims, gs }) => (
            <li key={profile.id}>
              <PersonCard
                handle={profile.handle}
                name={profile.name}
                dept={profile.dept}
                year={profile.year}
                lookingFor={profile.looking_for}
                availabilityWindows={profile.availability_windows}
                score={Math.round(gs.total * 100)}
                claims={claims}
              />
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
