import { describe, expect, it } from 'vitest'
import { GUILD_SKILL_VOCABULARY, skillsFromRepos, type RepoEvidence } from './languages'

function repo(over: Partial<RepoEvidence> & { name: string }): RepoEvidence {
  return {
    url: `https://github.com/anu/${over.name}`,
    language: null,
    description: null,
    stars: 0,
    ...over,
  }
}

const skills = (repos: RepoEvidence[]) => skillsFromRepos(repos).map((s) => s.skill)

describe('skillsFromRepos', () => {
  it('maps a language with no ambiguity straight through', () => {
    const out = skillsFromRepos([
      repo({ name: 'api-gateway', language: 'Go', description: 'HTTP router', stars: 3 }),
    ])
    expect(out).toEqual([
      {
        skill: 'backend',
        proofUrl: 'https://github.com/anu/api-gateway',
        reason: 'Go in api-gateway',
      },
    ])
  })

  // The expensive mistake in the whole module: TypeScript is both halves of the
  // stack, and a wrong `react` claim puts someone in a role they cannot fill.
  it('reads TypeScript as react only when something says frontend', () => {
    expect(
      skills([repo({ name: 'dashboard', language: 'TypeScript', topics: ['react'] })]),
    ).toEqual(['react'])
    expect(
      skills([repo({ name: 'ledger', language: 'TypeScript', description: 'REST service' })]),
    ).toEqual(['backend'])
  })

  it('names the signal, not just the language, when the signal did the routing', () => {
    const [claim] = skillsFromRepos([
      repo({ name: 'dashboard', language: 'JavaScript', description: 'Nextjs admin panel' }),
    ])
    expect(claim.reason).toBe('JavaScript with nextjs in dashboard')
  })

  // Topics and description are different fields on the API and both are the
  // author's own words, so neither may be the only one that counts.
  it('finds the ML signal in a description and in topics alike', () => {
    const fromDescription = skillsFromRepos([
      repo({ name: 'vision-pipeline', language: 'Python', description: 'pytorch defect detector' }),
    ])
    expect(fromDescription.map((s) => s.skill)).toEqual(['backend', 'machine-learning'])
    expect(fromDescription[1].reason).toBe('Python with pytorch in vision-pipeline')

    expect(
      skills([repo({ name: 'vision-pipeline', language: 'Python', topics: ['tensorflow'] })]),
    ).toEqual(['backend', 'machine-learning'])
  })

  it('leaves plain Python as backend', () => {
    expect(
      skills([repo({ name: 'scraper', language: 'Python', description: 'flask app' })]),
    ).toEqual(['backend'])
  })

  // C is the other language that means two unrelated jobs. Hardware evidence
  // has to replace the backend reading, not sit alongside it.
  it('reads C as embedded from topics, and drops the backend claim', () => {
    const out = skillsFromRepos([
      repo({ name: 'led-driver', language: 'C', topics: ['esp32', 'firmware'] }),
    ])
    expect(out.map((s) => s.skill)).toEqual(['embedded'])
    expect(out[0].reason).toBe('C with esp32 in led-driver')
  })

  it('claims a skill from topics alone when the language cannot show it', () => {
    expect(skills([repo({ name: 'design-kit', language: null, topics: ['figma'] })])).toEqual([
      'figma',
    ])
  })

  // The proof link is the whole reason a claim is trusted, so it must point at
  // the best repo behind the skill rather than whichever one came back first.
  it('keeps the most-starred repo as the proof for a repeated skill', () => {
    const out = skillsFromRepos([
      repo({ name: 'toy-api', language: 'Go', stars: 2 }),
      repo({ name: 'prod-api', language: 'Go', stars: 40 }),
      repo({ name: 'other-api', language: 'Go', stars: 9 }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].proofUrl).toBe('https://github.com/anu/prod-api')
    expect(out[0].reason).toBe('Go in prod-api')
  })

  it('breaks star ties by name, so input order cannot change the answer', () => {
    const zebra = repo({ name: 'zebra-api', language: 'Go', stars: 5 })
    const alpha = repo({ name: 'alpha-api', language: 'Go', stars: 5 })
    expect(skillsFromRepos([zebra, alpha])).toEqual(skillsFromRepos([alpha, zebra]))
    expect(skillsFromRepos([zebra, alpha])[0].proofUrl).toBe('https://github.com/anu/alpha-api')
  })

  it('sorts by skill, so the same profile ranks the same on every run', () => {
    const repos = [
      repo({ name: 'wallet', language: 'Solidity' }),
      repo({ name: 'api', language: 'Go' }),
      repo({ name: 'app', language: 'Dart' }),
    ]
    expect(skills(repos)).toEqual(['backend', 'blockchain', 'flutter'])
    expect(skillsFromRepos([...repos].reverse())).toEqual(skillsFromRepos(repos))
  })

  it('survives the shapes the GitHub API actually returns for a bare repo', () => {
    expect(skillsFromRepos([])).toEqual([])
    expect(
      skillsFromRepos([
        repo({ name: 'dotfiles', language: null, description: null, stars: Number.NaN }),
        repo({ name: 'empty', language: 'Brainfuck', stars: -12 }),
      ]),
    ).toEqual([])
  })

  it('still ranks a repo whose star count is junk', () => {
    const out = skillsFromRepos([
      repo({ name: 'api', language: 'Go', stars: Number.NaN }),
      repo({ name: 'zzz', language: 'Go', stars: -5 }),
    ])
    // Both normalise to zero stars, so the name decides and nothing throws.
    expect(out[0].proofUrl).toBe('https://github.com/anu/api')
  })

  // A claim with no link would reach the engine as verified evidence pointing
  // nowhere, which is worse than not claiming the skill at all.
  it('drops a repo with no url rather than emitting an unprovable claim', () => {
    expect(skillsFromRepos([repo({ name: 'ghost', url: '  ', language: 'Go' })])).toEqual([])
  })

  it('keeps the reason short enough for the row it is rendered in', () => {
    const [claim] = skillsFromRepos([
      repo({ name: 'a-very-'.repeat(12) + 'long-name', language: 'Go' }),
    ])
    expect(claim.reason.length).toBeLessThanOrEqual(60)
    expect(claim.reason.endsWith('.')).toBe(false)
  })

  // Exact string equality is how the engine matches, so an off-vocabulary
  // claim does not score badly, it never scores at all.
  it('only ever emits vocabulary skills, across the whole mapping table', () => {
    const out = skillsFromRepos([
      repo({ name: 'vision', language: 'Jupyter Notebook', stars: 1 }),
      repo({ name: 'infra', language: 'HCL', topics: ['terraform'] }),
      repo({ name: 'shipit', language: 'Shell', topics: ['ci-cd'] }),
      repo({ name: 'reports', language: 'SQL', topics: ['etl', 'airflow'] }),
      repo({ name: 'game', language: 'C#', topics: ['unity'] }),
      repo({ name: 'app', language: 'Dart' }),
      repo({ name: 'wallet', language: 'Solidity', topics: ['web3'] }),
      repo({ name: 'scanner', language: 'Rust', topics: ['pentest'] }),
      repo({ name: 'kit', language: null, topics: ['design-system', 'figma'] }),
      repo({ name: 'notes', language: null, topics: ['technical-writing'] }),
      repo({ name: 'reel', language: null, topics: ['video-editing'] }),
      repo({ name: 'deck', language: null, description: 'our pitch deck for demo day' }),
    ])
    expect(out.length).toBeGreaterThan(8)
    for (const claim of out) {
      expect(GUILD_SKILL_VOCABULARY).toContain(claim.skill)
      expect(claim.proofUrl).not.toBe('')
      expect(claim.reason.length).toBeLessThanOrEqual(60)
    }
  })
})
