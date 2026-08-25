import { describe, expect, it } from 'vitest'
import {
  autoDraft,
  complementarity,
  effectiveProficiency,
  explainScore,
  gapFeed,
  guildScore,
  marginalGain,
  peopleYouShouldMeet,
  rankCandidates,
  requirementCoverage,
  scoreTeam,
  sharedMinutesPerWeek,
  teamRisks,
  WEIGHTS,
  type Member,
  type Requirement,
} from '..'

const evenings = (days: number[]): Member['availability'] =>
  days.map((day) => ({ day: day as 0 | 1 | 2 | 3 | 4 | 5 | 6, start: '18:00', end: '21:00' }))

function member(
  id: string,
  skills: [string, number, boolean][],
  over: Partial<Member> = {},
): Member {
  return {
    id,
    name: id,
    experienceLevel: 3,
    commitmentLevel: 3,
    availability: evenings([2, 4]),
    skills: skills.map(([skill, proficiency, verified]) => ({ skill, proficiency, verified })),
    ...over,
  }
}

const req = (id: string, skill: string, weight = 1, minProficiency = 0): Requirement => ({
  id,
  skill,
  weight,
  minProficiency,
})

describe('coverage — the diminishing-returns thesis', () => {
  it('combines 0.8 and 0.5 into 0.9, not 1.3', () => {
    const entry = requirementCoverage(req('r', 'react'), [
      member('a', [['react', 0.8, true]]),
      member('b', [['react', 0.5, true]]),
    ])
    expect(entry.coverage).toBeCloseTo(0.9, 10)
  })

  it('moves a duplicate 0.8 from 0.8 to 0.96', () => {
    const entry = requirementCoverage(req('r', 'react'), [
      member('a', [['react', 0.8, true]]),
      member('b', [['react', 0.8, true]]),
    ])
    expect(entry.coverage).toBeCloseTo(0.96, 10)
  })

  it('damps unverified claims to 0.6x', () => {
    expect(effectiveProficiency({ skill: 'x', proficiency: 0.8, verified: false })).toBeCloseTo(
      0.48,
    )
  })

  it('hard-gates claims below minProficiency', () => {
    const entry = requirementCoverage(req('r', 'react', 1, 0.5), [
      member('a', [['react', 0.8, false]]), // effective 0.48 < 0.5 gate
    ])
    expect(entry.coverage).toBe(0)
    expect(entry.contributors).toHaveLength(0)
  })
})

describe('marginal gain — gaps beat duplicates', () => {
  const reqs = [req('r-react', 'react', 2), req('r-figma', 'figma', 2)]
  const team = [member('owner', [['react', 0.8, true]])]

  it('ranks the gap-filler above the equally-skilled duplicate', () => {
    const dupe = member('dupe', [['react', 0.8, true]])
    const filler = member('filler', [['figma', 0.8, true]])
    const ranked = rankCandidates(team, reqs, [dupe, filler])
    expect(ranked[0].candidateId).toBe('filler')
    expect(ranked[0].delta).toBeGreaterThan(ranked[1].delta)
  })

  it('labels fills vs duplicates against the current roster', () => {
    const both = member('both', [
      ['react', 0.7, true],
      ['figma', 0.7, true],
    ])
    const gain = marginalGain(team, reqs, both)
    expect(gain.fills).toEqual(['r-figma'])
    expect(gain.duplicates).toEqual([{ requirementId: 'r-react', alreadyCoveredBy: ['owner'] }])
  })

  it('makes an extra body who fills nothing a NEGATIVE gain', () => {
    // This is the anti-headcount claim: a warm body costs coordination
    // (shared time drops from the solo default) and buys no coverage, so the
    // engine ranks the team as strictly worse for adding them.
    const solo = [member('owner', [['react', 0.8, true]])]
    const spare = member('spare', [])
    const gain = marginalGain(solo, [req('r-react', 'react')], spare)
    expect(gain.delta).toBeLessThan(0)
    expect(gain.fills).toEqual([])
    expect(gain.duplicates).toEqual([])
  })

  it('never offers someone already on the roster as a candidate', () => {
    const owner = team[0]
    const ranked = rankCandidates(team, reqs, [owner, member('filler', [['figma', 0.8, true]])])
    expect(ranked.map((r) => r.candidateId)).toEqual(['filler'])
  })
})

describe('team score components', () => {
  it('gives solo teams no coordination penalty', () => {
    const ts = scoreTeam([member('a', [['react', 1, true]])], [req('r', 'react')])
    expect(ts.overlap).toBe(1)
    expect(ts.balance).toBe(1)
    expect(ts.commitment).toBe(1)
  })

  it('computes shared minutes as a strict intersection', () => {
    const a = member('a', [], { availability: evenings([2, 4]) })
    const b = member('b', [], { availability: evenings([4, 6]) })
    expect(sharedMinutesPerWeek([a, b])).toBe(180) // only Thursday 18-21
  })

  it('penalises commitment spread', () => {
    const ts = scoreTeam(
      [
        member('a', [], { commitmentLevel: 5 }),
        member('b', [], { commitmentLevel: 1, availability: evenings([2, 4]) }),
      ],
      [],
    )
    expect(ts.commitment).toBe(0)
  })
})

describe('the headline equation — 0.60 / 0.15 / 0.15 / 0.10', () => {
  it('publishes exactly the weights the product claims', () => {
    expect(WEIGHTS).toEqual({ base: 0.6, overlap: 0.15, balance: 0.15, commitment: 0.1 })
  })

  it('is the weighted sum of the four terms, to the last decimal', () => {
    // Two people, every term chosen so it can be worked out by hand:
    //   base       0.8   (one verified 0.8 react claim covers the sole req)
    //   overlap    0.6   (360 shared min/week against the 600 target)
    //   balance    0.75  (experience 3 and 5 -> variance 1 -> 1 - 1/4)
    //   commitment 0.75  (commitment 3 and 4 -> spread 1 -> 1 - 1/4)
    const a = member('a', [['react', 0.8, true]], { experienceLevel: 3, commitmentLevel: 3 })
    const b = member('b', [], { experienceLevel: 5, commitmentLevel: 4 })
    const ts = scoreTeam([a, b], [req('r-react', 'react')])

    expect(ts.base).toBeCloseTo(0.8, 10)
    expect(ts.overlapMinutes).toBe(360)
    expect(ts.overlap).toBeCloseTo(0.6, 10)
    expect(ts.balance).toBeCloseTo(0.75, 10)
    expect(ts.commitment).toBeCloseTo(0.75, 10)
    expect(ts.score).toBeCloseTo(0.7575, 10)
    expect(ts.score).toBeCloseTo(
      WEIGHTS.base * ts.base +
        WEIGHTS.overlap * ts.overlap +
        WEIGHTS.balance * ts.balance +
        WEIGHTS.commitment * ts.commitment,
      12,
    )
  })

  it('weights base by requirement weight, not by requirement count', () => {
    // A fully-covered weight-3 requirement and an empty weight-1 one is 0.75,
    // where an unweighted mean would say 0.5.
    const ts = scoreTeam(
      [member('a', [['react', 1, true]])],
      [req('r-react', 'react', 3), req('r-figma', 'figma', 1)],
    )
    expect(ts.base).toBeCloseTo(0.75, 10)
  })

  it('scores a project with no requirements as base 0, not NaN', () => {
    const ts = scoreTeam([member('a', [['react', 1, true]])], [])
    expect(ts.base).toBe(0)
    expect(Number.isFinite(ts.score)).toBe(true)
  })

  it('scores an empty roster without dividing by zero', () => {
    // /squad/[id] renders before anyone is drafted, so this path is on screen.
    const ts = scoreTeam([], [req('r-react', 'react')])
    expect(ts.base).toBe(0)
    expect(ts.coverage[0].coverage).toBe(0)
    expect(ts.score).toBeCloseTo(0.4, 10) // the three solo-default terms only
    expect(Number.isNaN(ts.score)).toBe(false)
  })
})

describe('availability — malformed windows must not poison the intersection', () => {
  it('drops an unparseable time instead of returning NaN for the whole team', () => {
    const a = member('a', [], {
      availability: [
        { day: 2, start: 'abc', end: '21:00' },
        { day: 4, start: '18:00', end: '21:00' },
      ],
    })
    const b = member('b', [], { availability: evenings([2, 4]) })
    const shared = sharedMinutesPerWeek([a, b])
    expect(Number.isNaN(shared)).toBe(false)
    expect(shared).toBe(180) // Thursday survives, Tuesday is discarded
  })

  it('drops a window that ends before it starts', () => {
    const a = member('a', [], { availability: [{ day: 2, start: '21:00', end: '18:00' }] })
    const b = member('b', [], { availability: evenings([2]) })
    expect(sharedMinutesPerWeek([a, b])).toBe(0)
  })

  it('returns 0 for an empty roster', () => {
    expect(sharedMinutesPerWeek([])).toBe(0)
  })
})

describe('auto-draft', () => {
  const reqs = [req('r-react', 'react', 2), req('r-figma', 'figma', 2), req('r-ml', 'ml', 3)]
  const pool = [
    member('react-1', [['react', 0.9, true]]),
    member('react-2', [['react', 0.85, true]]),
    member('figma-1', [['figma', 0.8, true]]),
    member('ml-1', [['ml', 0.8, true]]),
  ]

  it('drafts one person per gap before any duplicate', () => {
    const { picks } = autoDraft(pool, reqs)
    const first3 = picks.slice(0, 3).map((p) => p.member.id)
    expect(new Set(first3)).toEqual(new Set(['react-1', 'figma-1', 'ml-1']))
  })

  it('is deterministic across runs', () => {
    const a = autoDraft(pool, reqs).picks.map((p) => p.member.id)
    const b = autoDraft(pool, reqs).picks.map((p) => p.member.id)
    expect(a).toEqual(b)
  })

  it('reports a monotonically improving score and stops on diminishing returns', () => {
    const { picks, final } = autoDraft(pool, reqs)
    const scores = picks.map((p) => p.scoreAfter)
    expect(scores).toEqual([...scores].sort((x, y) => x - y))
    // Every pick must clear the minGain floor, so the draft stops rather than
    // filling seats for their own sake.
    expect(picks.every((p) => p.gainAtPick >= 0.005)).toBe(true)
    expect(final.score).toBeCloseTo(scores[scores.length - 1], 10)
  })

  it('honours maxSize and never re-drafts someone already seated', () => {
    const { picks } = autoDraft(pool, reqs, { start: [pool[0]], maxSize: 3 })
    expect(picks).toHaveLength(2) // one seat was taken before the draft began
    expect(picks.map((p) => p.member.id)).not.toContain('react-1')
  })
})

describe('risks', () => {
  it('flags a bus factor when one person carries a requirement', () => {
    const risks = teamRisks(
      [member('solo', [['react', 0.9, true]]), member('other', [['figma', 0.9, true]])],
      [req('r-react', 'react', 2), req('r-figma', 'figma', 2)],
    )
    const types = risks.map((r) => r.type)
    expect(types).toContain('bus_factor')
  })

  it('flags a dead zone when the team cannot meet', () => {
    const a = member('a', [], { availability: evenings([1]) })
    const b = member('b', [], { availability: evenings([3]) })
    const risks = teamRisks([a, b], [])
    expect(risks.map((r) => r.type)).toContain('availability_dead_zone')
  })

  it('escalates an unmet requirement by its weight', () => {
    const risks = teamRisks(
      [member('a', [])],
      [req('r-heavy', 'ml', 2), req('r-light', 'copywriting', 1)],
    )
    const byId = new Map(risks.map((r) => [r.requirementId, r]))
    expect(byId.get('r-heavy')?.type).toBe('unmet_requirement')
    expect(byId.get('r-heavy')?.severity).toBe('high')
    expect(byId.get('r-light')?.severity).toBe('medium')
  })

  it('flags a commitment gap once the spread reaches 3 of 5', () => {
    const wide = teamRisks(
      [
        member('a', [], { commitmentLevel: 5 }),
        member('b', [], { commitmentLevel: 2 }), // spread 3
      ],
      [],
    )
    const narrow = teamRisks(
      [
        member('a', [], { commitmentLevel: 5 }),
        member('b', [], { commitmentLevel: 3 }), // spread 2
      ],
      [],
    )
    expect(wide.map((r) => r.type)).toContain('commitment_gap')
    expect(narrow.map((r) => r.type)).not.toContain('commitment_gap')
  })

  it('reports nothing to worry about for a whole, well-matched team', () => {
    const risks = teamRisks(
      [
        member('a', [['react', 0.9, true]]),
        member('b', [['react', 0.8, true]]),
        member('c', [['figma', 0.9, true]]),
        member('d', [['figma', 0.8, true]]),
      ],
      [req('r-react', 'react', 2), req('r-figma', 'figma', 2)],
    )
    expect(risks).toEqual([])
  })
})

describe('explainScore — every number in the UI can say why', () => {
  const designer = {
    id: 'r-design',
    skill: 'figma',
    roleLabel: 'Designer',
    weight: 2,
    minProficiency: 0,
  }

  it('names the people behind a covered requirement', () => {
    const team = [member('a', [['react', 0.9, true]], { name: 'Aarav' })]
    const reqs = [req('r-react', 'react')]
    expect(explainScore(scoreTeam(team, reqs), reqs, team)).toEqual(['react: 90% via Aarav'])
  })

  it('calls an uncovered requirement an open gap, by its role label', () => {
    const team = [member('a', [['react', 0.9, true]])]
    const lines = explainScore(scoreTeam(team, [designer]), [designer], team)
    expect(lines).toEqual(['Designer: open gap'])
  })

  it('marks thin coverage that exists but sits under the threshold', () => {
    const team = [member('a', [['react', 0.4, true]], { name: 'Aarav' })]
    const reqs = [req('r-react', 'react')]
    expect(explainScore(scoreTeam(team, reqs), reqs, team)[0]).toBe(
      'react: 40% via Aarav — still thin',
    )
  })

  it('adds the coordination lines only once there is more than one person', () => {
    const reqs = [req('r-react', 'react')]
    const solo = [member('a', [['react', 0.9, true]])]
    expect(explainScore(scoreTeam(solo, reqs), reqs, solo)).toHaveLength(1)

    const pair = [...solo, member('b', [['react', 0.9, true]])]
    const lines = explainScore(scoreTeam(pair, reqs), reqs, pair)
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('Shared time: 6h/week')
    expect(lines[2]).toContain('Experience balance 100%')
  })
})

describe('social layer', () => {
  it('scores clones at zero complementarity', () => {
    const a = member('a', [['react', 0.9, true]])
    const b = member('b', [['react', 0.9, true]])
    expect(complementarity(a, b).score).toBe(0)
  })

  it("rewards people who fill each other's gaps", () => {
    const a = member('a', [['react', 0.9, true]])
    const b = member('b', [['figma', 0.9, true]])
    const comp = complementarity(a, b)
    expect(comp.score).toBe(1)
    expect(comp.aFills).toEqual(['react'])
    expect(comp.bFills).toEqual(['figma'])
  })

  it('ignores claims that sit under the proficiency floor', () => {
    // 0.5 with no proof link damps to 0.30, below the 0.40 floor -- so this
    // person brings nothing to the pairing despite listing the skill.
    const a = member('a', [['react', 0.5, false]])
    const b = member('b', [['figma', 0.9, true]])
    const comp = complementarity(a, b)
    expect(comp.aFills).toEqual([])
    expect(comp.bFills).toEqual(['figma'])
  })

  it('peopleYouShouldMeet excludes me and respects the limit', () => {
    const me = member('me', [['react', 0.9, true]])
    const pool = [
      me,
      member('clone', [['react', 0.9, true]]),
      member('designer', [['figma', 0.9, true]]),
      member('scientist', [['ml', 0.9, true]]),
    ]
    const suggestions = peopleYouShouldMeet(me, pool, 2)
    expect(suggestions).toHaveLength(2)
    expect(suggestions.map((s) => s.member.id)).not.toContain('me')
    expect(suggestions.map((s) => s.member.id)).not.toContain('clone')
  })

  it('gapFeed ranks projects by my marginal gain and skips my own teams', () => {
    const me = member('me', [['figma', 0.9, true]])
    const feed = gapFeed(me, [
      {
        projectId: 'needs-figma',
        reqs: [req('r', 'figma', 3)],
        team: [member('x', [['react', 0.8, true]])],
      },
      {
        projectId: 'mine',
        reqs: [req('r2', 'figma', 3)],
        team: [me],
      },
      {
        projectId: 'covered',
        reqs: [req('r3', 'figma', 3)],
        team: [member('y', [['figma', 0.95, true]])],
      },
    ])
    expect(feed[0].projectId).toBe('needs-figma')
    expect(feed.map((f) => f.projectId)).not.toContain('mine')
  })

  it('guild score: scarcity rewards demanded-but-rare skills', () => {
    const pool = [
      member('me', [['figma', 0.9, true]]),
      member('p1', [['react', 0.9, true]]),
      member('p2', [['react', 0.9, true]]),
    ]
    const openReqs = [req('r1', 'figma', 2), req('r2', 'figma', 2), req('r3', 'react', 2)]
    const rare = guildScore(pool[0], pool, openReqs)
    const common = guildScore(pool[1], pool, openReqs)
    expect(rare.scarcity).toBeGreaterThan(common.scarcity)
    expect(rare.rareSkills[0].skill).toBe('figma')
  })

  it('guild score: totals 0.40 credibility + 0.25 versatility + 0.35 scarcity', () => {
    const me = member('me', [
      ['react', 0.9, true],
      ['figma', 0.9, true],
      ['ml', 0.9, false],
      ['copy', 0.9, false],
    ])
    const gs = guildScore(me, [me], []) // no open requirements -> no scarcity
    expect(gs.credibility).toBeCloseTo(0.5, 10) // 2 of 4 claims carry proof
    expect(gs.versatility).toBeCloseTo(0.5, 10) // 4 distinct skills of the 8 cap
    expect(gs.scarcity).toBe(0)
    expect(gs.rareSkills).toEqual([])
    expect(gs.total).toBeCloseTo(0.4 * 0.5 + 0.25 * 0.5 + 0.35 * 0, 10)
  })

  it('guild score: versatility caps at eight distinct skills', () => {
    const skills = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(
      (s) => [s, 0.9, true] as [string, number, boolean],
    )
    const me = member('me', skills)
    expect(guildScore(me, [me], []).versatility).toBe(1)
  })

  it('guild score: a profile with no skills scores zero rather than NaN', () => {
    const empty = member('empty', [])
    const gs = guildScore(empty, [empty], [req('r', 'react')])
    expect(gs.credibility).toBe(0)
    expect(gs.versatility).toBe(0)
    expect(gs.scarcity).toBe(0)
    expect(gs.total).toBe(0)
  })
})
