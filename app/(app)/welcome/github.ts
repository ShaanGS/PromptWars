'use server'

import { fetchGitHubEvidence } from '@/lib/github/client'
import { skillsFromRepos, type SkillEvidence } from '@/lib/github/languages'

/**
 * Turning a GitHub username into backed skill claims.
 *
 * Runs on the server so GITHUB_TOKEN never reaches the browser, and so the
 * fetch is not subject to the visitor's own network. The mapping itself is
 * pure and tested (lib/github/languages.ts); this is only the boundary.
 */

export type LinkGitHubResult =
  { ok: true; login: string; evidence: SkillEvidence[] } | { ok: false; message: string }

export async function linkGitHub(username: string): Promise<LinkGitHubResult> {
  const res = await fetchGitHubEvidence(username)
  if (!res.ok) return { ok: false, message: res.message }

  const evidence = skillsFromRepos(res.repos)
  if (evidence.length === 0) {
    return {
      ok: false,
      // Distinguished from a failed fetch on purpose: the account was found
      // and read, it simply carries nothing this vocabulary recognises.
      message: `Read ${res.repos.length} public repos on ${res.login}, but none map to a skill teams here ask for.`,
    }
  }

  return { ok: true, login: res.login, evidence }
}
