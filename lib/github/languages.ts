/**
 * GitHub repo evidence -> Guild skill claims.
 *
 * `lib/engine/` matches skills with `===` against a fixed vocabulary, so a
 * claim spelled `Machine Learning` is not a weaker match than
 * `machine-learning` -- it is invisible. The tables below are typed against the
 * vocabulary so a misspelling is a compile error rather than a claim that
 * silently never scores.
 *
 * Import-free on purpose, like the engine: the mapping is the argument being
 * made to a reviewer, and it stays checkable in milliseconds.
 */

const VOCABULARY = [
  'backend',
  'react',
  'machine-learning',
  'content-writing',
  'devops',
  'ui-ux',
  'data-engineering',
  'figma',
  'flutter',
  'blockchain',
  'embedded',
  'video-editing',
  'unity',
  'pitching',
  'cybersecurity',
] as const

type GuildSkill = (typeof VOCABULARY)[number]

/** Exported so a caller can reject a claim the engine would silently drop. */
export const GUILD_SKILL_VOCABULARY: readonly string[] = VOCABULARY

export type RepoEvidence = {
  name: string
  url: string
  language: string | null
  description: string | null
  stars: number
  topics?: string[]
}

export type SkillEvidence = {
  skill: string
  proofUrl: string
  reason: string
}

/**
 * A `react` claim on a backend repo costs more than a missing one: the engine
 * gates on it and puts the wrong person in the role. So the frontend list holds
 * only terms that are frontend and nothing else. Bare `next` and bare `ui` are
 * absent deliberately -- both are ordinary English in a repo description.
 */
const FRONTEND = [
  'react',
  'reactjs',
  'react native',
  'nextjs',
  'next js',
  'frontend',
  'front end',
  'jsx',
  'tsx',
  'redux',
  'tailwind',
  'tailwindcss',
  'vite',
] as const

/**
 * Named tools, not vocabulary an author might use loosely -- a repo saying
 * "ai" or "model" has not shown it trains anything, and these fire on any
 * language.
 */
const ML_STRONG = [
  'machine learning',
  'deep learning',
  'pytorch',
  'tensorflow',
  'keras',
  'sklearn',
  'scikit learn',
  'scikit',
  'neural network',
  'neural networks',
  'opencv',
  'computer vision',
  'nlp',
  'llm',
] as const

/**
 * Only trusted alongside Python, where the surrounding work is already data
 * work. `cv` from the original shortlist is missing on purpose: on GitHub it
 * reads as a CV, and every résumé repo would claim vision.
 */
const ML_WEAK = ['ml', 'ai', 'model', 'models', 'neural', 'classifier'] as const

const ML_SIGNALS = [...ML_STRONG, ...ML_WEAK] as const

const EMBEDDED = [
  'arduino',
  'esp32',
  'esp8266',
  'stm32',
  'firmware',
  'embedded',
  'rtos',
  'freertos',
  'microcontroller',
  'raspberry pi',
] as const

/** `game` is included only for C#, where the engine of choice is Unity. */
const UNITY = ['unity', 'unity3d', 'gamedev', 'game dev', 'game'] as const

type LanguageRule = {
  /** Claimed on the language alone. */
  skill: GuildSkill
  /**
   * A narrower reading the terms unlock. `exclusive` replaces the base claim --
   * a Unity C# repo is game work, not backend work -- while a non-exclusive
   * qualifier adds to it, because a Python ML repo really is both.
   */
  qualifier?: { terms: readonly string[]; skill: GuildSkill; exclusive: boolean }
}

/** Keyed by the language name GitHub reports, lowercased. */
const LANGUAGES: Record<string, LanguageRule> = {
  typescript: { skill: 'backend', qualifier: { terms: FRONTEND, skill: 'react', exclusive: true } },
  javascript: { skill: 'backend', qualifier: { terms: FRONTEND, skill: 'react', exclusive: true } },
  python: {
    skill: 'backend',
    qualifier: { terms: ML_SIGNALS, skill: 'machine-learning', exclusive: false },
  },
  // A notebook is analysis being shown; there is no server in it.
  'jupyter notebook': { skill: 'machine-learning' },
  go: { skill: 'backend' },
  rust: { skill: 'backend' },
  java: { skill: 'backend' },
  kotlin: { skill: 'backend' },
  ruby: { skill: 'backend' },
  php: { skill: 'backend' },
  'c#': { skill: 'backend', qualifier: { terms: UNITY, skill: 'unity', exclusive: true } },
  c: { skill: 'backend', qualifier: { terms: EMBEDDED, skill: 'embedded', exclusive: true } },
  'c++': { skill: 'backend', qualifier: { terms: EMBEDDED, skill: 'embedded', exclusive: true } },
  dart: { skill: 'flutter' },
  solidity: { skill: 'blockchain' },
  hcl: { skill: 'devops' },
  dockerfile: { skill: 'devops' },
  shell: { skill: 'devops' },
  sql: { skill: 'data-engineering' },
  // The names GitHub actually returns for stored procedures.
  plpgsql: { skill: 'data-engineering' },
  tsql: { skill: 'data-engineering' },
}

/**
 * Skills a language cannot show. Most of the vocabulary is invisible to the
 * language stat -- a Figma plugin and a pitch deck are both "JavaScript" or
 * nothing at all -- so the author's own topics carry them.
 *
 * `backend` is missing here on purpose: it is the fallback for half the
 * language table already, and a topic list would only inflate it.
 */
const KEYWORDS: readonly { skill: GuildSkill; terms: readonly string[] }[] = [
  { skill: 'machine-learning', terms: ML_STRONG },
  { skill: 'embedded', terms: EMBEDDED },
  { skill: 'unity', terms: ['unity', 'unity3d'] },
  { skill: 'flutter', terms: ['flutter'] },
  { skill: 'figma', terms: ['figma'] },
  {
    skill: 'devops',
    terms: [
      'devops',
      'kubernetes',
      'k8s',
      'terraform',
      'docker',
      'ansible',
      'helm',
      'github actions',
      'ci cd',
      'cicd',
    ],
  },
  {
    skill: 'data-engineering',
    terms: [
      'data engineering',
      'data pipeline',
      'data pipelines',
      'etl',
      'airflow',
      'dbt',
      'pyspark',
      'apache spark',
      'data warehouse',
      'bigquery',
      'snowflake',
    ],
  },
  {
    skill: 'blockchain',
    terms: [
      'blockchain',
      'web3',
      'ethereum',
      'solidity',
      'smart contract',
      'smart contracts',
      'defi',
      'nft',
      'solana',
    ],
  },
  {
    skill: 'cybersecurity',
    terms: [
      'cybersecurity',
      'cyber security',
      'infosec',
      'penetration testing',
      'pentest',
      'pentesting',
      'appsec',
      'vulnerability',
      'cryptography',
      'security',
      'ctf',
    ],
  },
  {
    skill: 'ui-ux',
    terms: [
      'ui ux',
      'uiux',
      'ux',
      'user experience',
      'design system',
      'wireframe',
      'wireframes',
      'usability',
      'ui design',
    ],
  },
  {
    // A repo that *is* a blog is evidence of the site, not of the writing, so
    // bare `blog` is left out.
    skill: 'content-writing',
    terms: [
      'content writing',
      'technical writing',
      'copywriting',
      'blog posts',
      'newsletter',
      'essays',
      'articles',
      'writing',
    ],
  },
  {
    skill: 'video-editing',
    terms: [
      'video editing',
      'video editor',
      'video production',
      'premiere pro',
      'after effects',
      'davinci resolve',
      'motion graphics',
    ],
  },
  // Bare `pitch` is audio in half of its uses, so the deck has to be named.
  { skill: 'pitching', terms: ['pitch deck', 'pitch decks', 'pitchdeck', 'investor deck'] },
]

/** Rendered in a list next to the claim, so it cannot run away with the row. */
const REASON_MAX = 60

function reasonFor(evidence: string, repoName: string): string {
  const full = `${evidence} in ${repoName}`
  if (full.length <= REASON_MAX) return full
  const room = REASON_MAX - evidence.length - 5
  return room > 0 ? `${evidence} in ${repoName.slice(0, room)}…` : evidence
}

/**
 * Topics, description and name flattened to space-delimited tokens, padded so a
 * term can be matched whole. Substring matching would read `ml` out of `html`
 * and `ai` out of `chennai`.
 */
function haystack(repo: RepoEvidence, repoName: string): string {
  const topics = Array.isArray(repo.topics) ? repo.topics : []
  const raw = [repoName, repo.description ?? '', ...topics].join(' ')
  return ` ${raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

function firstTerm(hay: string, terms: readonly string[]): string | null {
  for (const term of terms) {
    if (hay.includes(` ${term} `)) return term
  }
  return null
}

/** A NaN or negative count must not win a tie-break against a real repo. */
function starCount(value: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

type Claim = { skill: GuildSkill; reason: string }

function claimsFor(repo: RepoEvidence, repoName: string): Claim[] {
  const hay = haystack(repo, repoName)
  const claims: Claim[] = []

  // The language rule runs first so its reason wins when a keyword repeats it.
  const add = (skill: GuildSkill, evidence: string) => {
    if (claims.some((c) => c.skill === skill)) return
    claims.push({ skill, reason: reasonFor(evidence, repoName) })
  }

  const label = typeof repo.language === 'string' ? repo.language.trim() : ''
  const rule = label ? LANGUAGES[label.toLowerCase()] : undefined
  if (rule) {
    const qualifier = rule.qualifier
    const hit = qualifier ? firstTerm(hay, qualifier.terms) : null
    if (qualifier && hit) add(qualifier.skill, `${label} with ${hit}`)
    if (!(qualifier && hit && qualifier.exclusive)) add(rule.skill, label)
  }

  for (const keyword of KEYWORDS) {
    const hit = firstTerm(hay, keyword.terms)
    if (hit) add(keyword.skill, hit)
  }

  return claims
}

/**
 * One entry per skill, proved by the strongest repo that shows it, sorted by
 * skill. The determinism is the point: the same profile has to produce the same
 * claims on the server and on a re-run, or the ranking is not reproducible.
 */
export function skillsFromRepos(repos: RepoEvidence[]): SkillEvidence[] {
  if (!Array.isArray(repos)) return []

  const best = new Map<
    GuildSkill,
    { proofUrl: string; reason: string; stars: number; name: string }
  >()

  for (const repo of repos) {
    if (!repo || typeof repo !== 'object') continue

    const proofUrl = typeof repo.url === 'string' ? repo.url.trim() : ''
    // A claim nobody can click is not evidence; the engine would count it as
    // verified and damp nothing.
    if (!proofUrl) continue

    const repoName = (typeof repo.name === 'string' ? repo.name.trim() : '') || 'a repo'
    const stars = starCount(repo.stars)

    for (const claim of claimsFor(repo, repoName)) {
      const held = best.get(claim.skill)
      // Stars first, then name ascending -- a tie has to break somewhere and it
      // must break the same way every run.
      if (held && !(stars > held.stars || (stars === held.stars && repoName < held.name))) continue
      best.set(claim.skill, { proofUrl, reason: claim.reason, stars, name: repoName })
    }
  }

  return [...best.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([skill, evidence]) => ({
      skill,
      proofUrl: evidence.proofUrl,
      reason: evidence.reason,
    }))
}
