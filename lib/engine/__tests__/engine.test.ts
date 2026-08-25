import { describe, expect, it } from "vitest";
import {
  autoDraft,
  complementarity,
  effectiveProficiency,
  gapFeed,
  guildScore,
  marginalGain,
  rankCandidates,
  requirementCoverage,
  scoreTeam,
  sharedMinutesPerWeek,
  teamRisks,
  type Member,
  type Requirement,
} from "..";

const evenings = (days: number[]): Member["availability"] =>
  days.map((day) => ({ day: day as 0 | 1 | 2 | 3 | 4 | 5 | 6, start: "18:00", end: "21:00" }));

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
  };
}

const req = (id: string, skill: string, weight = 1, minProficiency = 0): Requirement => ({
  id,
  skill,
  weight,
  minProficiency,
});

describe("coverage — the diminishing-returns thesis", () => {
  it("combines 0.8 and 0.5 into 0.9, not 1.3", () => {
    const entry = requirementCoverage(req("r", "react"), [
      member("a", [["react", 0.8, true]]),
      member("b", [["react", 0.5, true]]),
    ]);
    expect(entry.coverage).toBeCloseTo(0.9, 10);
  });

  it("moves a duplicate 0.8 from 0.8 to 0.96", () => {
    const entry = requirementCoverage(req("r", "react"), [
      member("a", [["react", 0.8, true]]),
      member("b", [["react", 0.8, true]]),
    ]);
    expect(entry.coverage).toBeCloseTo(0.96, 10);
  });

  it("damps unverified claims to 0.6x", () => {
    expect(effectiveProficiency({ skill: "x", proficiency: 0.8, verified: false })).toBeCloseTo(0.48);
  });

  it("hard-gates claims below minProficiency", () => {
    const entry = requirementCoverage(req("r", "react", 1, 0.5), [
      member("a", [["react", 0.8, false]]), // effective 0.48 < 0.5 gate
    ]);
    expect(entry.coverage).toBe(0);
    expect(entry.contributors).toHaveLength(0);
  });
});

describe("marginal gain — gaps beat duplicates", () => {
  const reqs = [req("r-react", "react", 2), req("r-figma", "figma", 2)];
  const team = [member("owner", [["react", 0.8, true]])];

  it("ranks the gap-filler above the equally-skilled duplicate", () => {
    const dupe = member("dupe", [["react", 0.8, true]]);
    const filler = member("filler", [["figma", 0.8, true]]);
    const ranked = rankCandidates(team, reqs, [dupe, filler]);
    expect(ranked[0].candidateId).toBe("filler");
    expect(ranked[0].delta).toBeGreaterThan(ranked[1].delta);
  });

  it("labels fills vs duplicates against the current roster", () => {
    const both = member("both", [
      ["react", 0.7, true],
      ["figma", 0.7, true],
    ]);
    const gain = marginalGain(team, reqs, both);
    expect(gain.fills).toEqual(["r-figma"]);
    expect(gain.duplicates).toEqual([
      { requirementId: "r-react", alreadyCoveredBy: ["owner"] },
    ]);
  });
});

describe("team score components", () => {
  it("gives solo teams no coordination penalty", () => {
    const ts = scoreTeam([member("a", [["react", 1, true]])], [req("r", "react")]);
    expect(ts.overlap).toBe(1);
    expect(ts.balance).toBe(1);
    expect(ts.commitment).toBe(1);
  });

  it("computes shared minutes as a strict intersection", () => {
    const a = member("a", [], { availability: evenings([2, 4]) });
    const b = member("b", [], { availability: evenings([4, 6]) });
    expect(sharedMinutesPerWeek([a, b])).toBe(180); // only Thursday 18-21
  });

  it("penalises commitment spread", () => {
    const ts = scoreTeam(
      [
        member("a", [], { commitmentLevel: 5 }),
        member("b", [], { commitmentLevel: 1, availability: evenings([2, 4]) }),
      ],
      [],
    );
    expect(ts.commitment).toBe(0);
  });
});

describe("auto-draft", () => {
  const reqs = [req("r-react", "react", 2), req("r-figma", "figma", 2), req("r-ml", "ml", 3)];
  const pool = [
    member("react-1", [["react", 0.9, true]]),
    member("react-2", [["react", 0.85, true]]),
    member("figma-1", [["figma", 0.8, true]]),
    member("ml-1", [["ml", 0.8, true]]),
  ];

  it("drafts one person per gap before any duplicate", () => {
    const { picks } = autoDraft(pool, reqs);
    const first3 = picks.slice(0, 3).map((p) => p.member.id);
    expect(new Set(first3)).toEqual(new Set(["react-1", "figma-1", "ml-1"]));
  });

  it("is deterministic across runs", () => {
    const a = autoDraft(pool, reqs).picks.map((p) => p.member.id);
    const b = autoDraft(pool, reqs).picks.map((p) => p.member.id);
    expect(a).toEqual(b);
  });
});

describe("risks", () => {
  it("flags a bus factor when one person carries a requirement", () => {
    const risks = teamRisks(
      [member("solo", [["react", 0.9, true]]), member("other", [["figma", 0.9, true]])],
      [req("r-react", "react", 2), req("r-figma", "figma", 2)],
    );
    const types = risks.map((r) => r.type);
    expect(types).toContain("bus_factor");
  });

  it("flags a dead zone when the team cannot meet", () => {
    const a = member("a", [], { availability: evenings([1]) });
    const b = member("b", [], { availability: evenings([3]) });
    const risks = teamRisks([a, b], []);
    expect(risks.map((r) => r.type)).toContain("availability_dead_zone");
  });
});

describe("social layer", () => {
  it("scores clones at zero complementarity", () => {
    const a = member("a", [["react", 0.9, true]]);
    const b = member("b", [["react", 0.9, true]]);
    expect(complementarity(a, b).score).toBe(0);
  });

  it("rewards people who fill each other's gaps", () => {
    const a = member("a", [["react", 0.9, true]]);
    const b = member("b", [["figma", 0.9, true]]);
    const comp = complementarity(a, b);
    expect(comp.score).toBe(1);
    expect(comp.aFills).toEqual(["react"]);
    expect(comp.bFills).toEqual(["figma"]);
  });

  it("gapFeed ranks projects by my marginal gain and skips my own teams", () => {
    const me = member("me", [["figma", 0.9, true]]);
    const feed = gapFeed(me, [
      {
        projectId: "needs-figma",
        reqs: [req("r", "figma", 3)],
        team: [member("x", [["react", 0.8, true]])],
      },
      {
        projectId: "mine",
        reqs: [req("r2", "figma", 3)],
        team: [me],
      },
      {
        projectId: "covered",
        reqs: [req("r3", "figma", 3)],
        team: [member("y", [["figma", 0.95, true]])],
      },
    ]);
    expect(feed[0].projectId).toBe("needs-figma");
    expect(feed.map((f) => f.projectId)).not.toContain("mine");
  });

  it("guild score: scarcity rewards demanded-but-rare skills", () => {
    const pool = [
      member("me", [["figma", 0.9, true]]),
      member("p1", [["react", 0.9, true]]),
      member("p2", [["react", 0.9, true]]),
    ];
    const openReqs = [req("r1", "figma", 2), req("r2", "figma", 2), req("r3", "react", 2)];
    const rare = guildScore(pool[0], pool, openReqs);
    const common = guildScore(pool[1], pool, openReqs);
    expect(rare.scarcity).toBeGreaterThan(common.scarcity);
    expect(rare.rareSkills[0].skill).toBe("figma");
  });
});
