import type { RepoEvidence } from './languages'

/**
 * Reading a public GitHub profile.
 *
 * This is the one place Guild fetches evidence rather than taking a claim on
 * trust. A skill backed by a repo we actually retrieved counts in full; the
 * same skill typed into a box counts at UNVERIFIED_DAMP. That difference is
 * the product's answer to "who checks any of this", so the fetch has to be
 * real and its failures have to be legible rather than silent.
 *
 * GITHUB_TOKEN is optional but effectively required in production: an
 * unauthenticated caller gets 60 requests per hour PER IP, and serverless
 * functions share their egress IP with everything else on the platform, so
 * the quota is routinely gone before the first visitor arrives. A
 * fine-grained token with no scopes at all lifts it to 5,000/hour -- it
 * needs no permissions because every endpoint used here is public.
 */

const API = 'https://api.github.com'

export type GitHubResult =
  | { ok: true; login: string; name: string | null; avatarUrl: string; repos: RepoEvidence[] }
  | { ok: false; reason: 'not-found' | 'rate-limited' | 'unreachable'; message: string }

type RepoJson = {
  name: string
  html_url: string
  language: string | null
  description: string | null
  stargazers_count: number
  topics?: string[]
  fork: boolean
  archived: boolean
}

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN
  return {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    // A UA is not optional on this API; unlabelled callers get 403s.
    'user-agent': 'guild-team-formation',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

/** A GitHub login: alphanumeric and hyphens, never leading/trailing hyphen. */
export function normaliseLogin(input: string): string | null {
  const raw = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '')
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(raw) ? raw : null
}

export async function fetchGitHubEvidence(input: string): Promise<GitHubResult> {
  const login = normaliseLogin(input)
  if (!login) {
    return { ok: false, reason: 'not-found', message: 'That does not look like a GitHub username.' }
  }

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`${API}/users/${login}`, { headers: headers(), cache: 'no-store' }),
      fetch(`${API}/users/${login}/repos?sort=pushed&per_page=100`, {
        headers: headers(),
        cache: 'no-store',
      }),
    ])

    if (userRes.status === 404) {
      return { ok: false, reason: 'not-found', message: `No GitHub user called ${login}.` }
    }

    // 403 and 429 both mean quota here. Saying so beats "something went
    // wrong", because the fix is a token and the reader cannot guess that.
    if (userRes.status === 403 || userRes.status === 429 || reposRes.status === 403) {
      return {
        ok: false,
        reason: 'rate-limited',
        message: process.env.GITHUB_TOKEN
          ? 'GitHub is rate-limiting us. Try again in a minute.'
          : 'GitHub rate limit reached. Set GITHUB_TOKEN to raise it from 60 to 5,000 an hour.',
      }
    }

    if (!userRes.ok || !reposRes.ok) {
      return { ok: false, reason: 'unreachable', message: 'Could not reach GitHub just now.' }
    }

    const user = (await userRes.json()) as {
      login: string
      name: string | null
      avatar_url: string
    }
    const repos = (await reposRes.json()) as RepoJson[]

    return {
      ok: true,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      // Forks and archives are not evidence that someone can do the thing:
      // a fork is a copy of somebody else's work and an archive is a
      // statement that it is over.
      repos: (Array.isArray(repos) ? repos : [])
        .filter((r) => !r.fork && !r.archived)
        .map((r) => ({
          name: r.name,
          url: r.html_url,
          language: r.language ?? null,
          description: r.description ?? null,
          stars: Number.isFinite(r.stargazers_count) ? r.stargazers_count : 0,
          topics: Array.isArray(r.topics) ? r.topics : [],
        })),
    }
  } catch {
    return { ok: false, reason: 'unreachable', message: 'Could not reach GitHub just now.' }
  }
}
