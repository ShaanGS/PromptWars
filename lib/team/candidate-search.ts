import type { Member } from '@/lib/engine'

/**
 * Filtering the ranked candidate list by name or skill.
 *
 * The sandbox shows the top ten candidates, which is the right default and
 * the wrong ceiling: with forty people in the pool, anyone ranked eleventh is
 * unreachable, and the product's strongest claim -- that adding the wrong
 * person makes a team *worse* -- lives entirely in the negative tail nobody
 * could see. Searching restores the rest of the pool without disturbing the
 * default view.
 *
 * Deliberately fuzzier than the engine's own matching. `lib/engine/` compares
 * skills by exact string equality, so a requirement for `react` is not met by
 * `React`; that is the ranking's business and is not softened here. This is a
 * find-a-person box, where refusing to match "Meera" against "meera" would
 * just look broken.
 */
export function matchesMember(member: Member | undefined, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (!member) return false
  if (member.name.toLowerCase().includes(q)) return true
  return member.skills.some((s) => s.skill.toLowerCase().includes(q))
}
