# Project brief — Guild (built inside Olvable)

The single document that lets someone pick this project up cold. Written
2026-08-25 from an exhaustive survey of the code on disk, the live deploy at
`https://tryguild.vercel.app`, and the demo Supabase project
`fjxgqiveolnnrslihodl`. **Where the repo's prose contradicts the code, this file
states what the code does.** Every claim here was checked against a file, a test
run, or an HTTP response — not inferred from a comment.

Verified at time of writing: `npm run test` → **21 files, 241 tests, all
passing** (1.97 s). `npx vitest run lib/engine` → **41 tests** (both `CLAUDE.md`
and `AGENTS.md` say 17; they are stale). `npx prettier --check .` → **27 files
fail**, including all 11 files in `lib/engine/`.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [The product thesis](#2-the-product-thesis)
3. [Every screen](#3-every-screen)
4. [The Guild half](#4-the-guild-half)
5. [The Olvable half](#5-the-olvable-half)
6. [Data model](#6-data-model)
7. [Auth and security](#7-auth-and-security)
8. [Design system](#8-design-system)
9. [Testing](#9-testing)
10. [Infrastructure](#10-infrastructure)
11. [Orphaned, stubbed or broken](#11-orphaned-stubbed-or-broken)
12. [Where to take it next](#12-where-to-take-it-next)

---

## 1. What this is

One Next.js application containing two products that share a shell, a design
system and a database.

**Guild** is the product. It is a team-formation platform answering hackathon
**Problem Statement 2 (ProjectMatch)**: help people form effective teams from
skills, interests, availability, experience and project requirements. Its
distinguishing move is that it scores whole **teams** against project
**requirements** and then ranks a candidate by their **marginal gain to a
specific roster** — not by how good they are in the abstract. Guild owns
`lib/engine/`, `lib/team/`, `lib/demo.ts`, `components/team/`, and the routes
`/teams`, `/teams/new`, `/squad/[id]`, `/people`, `/p/[handle]`.

**Olvable** is the host. It is Shaan's Chennai/Tamil Nadu event aggregator
(originally `ShaanGS/chennai-events`) and it supplies the application shell, the
design system, the ingestion pipeline, the relevance scoring, and the event
corpus. Olvable owns `lib/connectors/`, `lib/pipeline/`, `lib/queries/`,
`lib/dates/`, `scripts/`, `config/`, and the routes `/feed`, `/events`,
`/hackathons`, `/calendar`, `/saved`, `/event/[id]`, `/e/[id]`, `/sources`,
`/interests`, `/settings`, `/admin/*`, `/design`.

**How they join.** `projects.event_id` is a real foreign key from a Guild squad
into Olvable's `events` table. A squad forms *around* a real, currently-open
hackathon that Olvable ingested from Devfolio, Devpost or Unstop — so a judge
can click through from a team to a live listing they can verify. That is the
only structural coupling; everything else is shared infrastructure.

`lib/brand.ts` says `name: 'Guild'` and the running app says Guild. `/` redirects
to `/teams`. Strings reading "Olvable" survive in perhaps a dozen places
(`lib/ics.ts` `PRODID`, `app/layout.tsx` `appleWebApp.title`, `/settings` copy,
`/design`'s h1, the favicon art, `demo@olvable.app`, the OG image) — those are
stale, not the intended name. "EventNadu" is dead and must not reappear.

### The evaluation result

Hack2Skill's automated evaluation scores the **repository** on six axes.
Recorded in `docs/sessions.md:5-27`:

- **Attempt 1: 74.72.** Problem Statement Alignment scored **37** while every
  other axis sat at 86–100. The cause was framing, not code: the deployed app
  opened on the event feed and the README described an event aggregator, so the
  grader concluded the project did not answer PS-2.
- **Attempt 2: 95.3, rank 1 of 400.** The fixes were structural — `/` redirects
  to `/teams`, nav leads with Team Board and People, README rewritten around
  PS-2 with the formula and a walkthrough whose numbers come from the engine,
  tests 185 → 241, `/teams/new` changed from a 404 to an honest placeholder.

Only one axis name is recorded in the repo ("Problem Statement Alignment"); the
other five are not named anywhere in the codebase. The lesson written into the
session log is worth keeping: *the grader reads what is on `main` at evaluation
time, and it reads the front door first.*

---

## 2. The product thesis

The problem statement's operative word is **complementary**. Filtering on
`skill = react` is trivial; the hard part is that the best individuals do not
make the best team. A tool that ranks people by raw skill hands a hackathon team
five React developers and no designer — which is exactly the failure the
statement describes.

### The maths

```
p_eff(member, r) = proficiency × (has a proof link ? 1.0 : 0.6)

coverage(r)      = 1 − Π(1 − p_eff)      over members clearing r's minProficiency

base             = Σ(weight_r × coverage_r) / Σ(weight_r)

score            = 0.60 · base
                 + 0.15 · availability_overlap
                 + 0.15 · experience_balance
                 + 0.10 · commitment_match

marginalGain(c)  = score(team ∪ {c}) − score(team)
```

**The product `Π(1 − p_eff)` is the whole idea.** Two people at 0.8 and 0.5 on
the same requirement give `1 − 0.2 × 0.5 = 0.90`, not `1.3`. The second person
moves coverage from 0.80 to 0.90; a person who fills an empty requirement moves
it from 0.00. Diminishing returns is not a rule bolted on afterwards — it falls
out of the arithmetic, which is why the ranking cannot be gamed by piling on
more of the same person. Source: `lib/engine/coverage.ts:17-29`.

Skill tags are the least reliable thing on any profile, so a claim backed by a
repo or a past project counts in full and an unbacked one counts at `0.6×`.
Because the damp is applied *before* the requirement's floor is checked, an
unverified claim needs `proficiency > minProficiency / 0.6` to count at all.
Credibility is modelled, not assumed.

The other three terms, from `lib/engine/score.ts:11-34`:

- `overlap = min(1, sharedMinutesPerWeek / 600)` — weekly minutes in the
  intersection of **all** members' availability windows. 10 h/week scores 1.0.
- `balance = 1 − variance(experienceLevels) / 4` — population variance; levels
  are 1–5 so max variance is 4 and balance lands in [0, 1].
- `commitment = 1 − (max − min) / 4` over `commitmentLevel`. A spread of 4
  scores 0.

**A solo or empty team is exempt from all three** (`solo = team.length <= 1`),
because coordination penalties only make sense between people. The consequence
matters for demos: **an empty roster scores exactly 0.40**, and the first person
to join a solo squad usually shows a tiny headline delta because the roster
loses the exemptions at the same moment coverage rises.

### How the statement maps to the model

| The statement asks for | Where it lives |
| --- | --- |
| Skills | `p_eff` per claim — proficiency, damped `0.6×` without a proof link |
| Project requirements | Weighted slots, each with a minimum-proficiency floor |
| Availability | `overlap` — weekly minutes **all** members share |
| Experience | `balance` — `1 − variance` of experience levels |
| Commitment | `commitment` — spread between keenest and least keen |
| Interests | The ingested event corpus a squad forms around; `scarcity` in the Guild Score |
| "who is available or interested" | The gap feed — open squads ranked by *your* marginal gain |

### The individual score

`lib/engine/guildScore.ts` produces a per-person 0–1 score, rendered 0–100 on
`/people` and `/p/[handle]`:

```
total = 0.40 · credibility + 0.25 · versatility + 0.35 · scarcity

credibility = verified claims / total claims          (denominator is rows, not distinct skills)
versatility = min(1, distinct skills / 8)             (deduplicated via a Set)
scarcity    = Σ over claims of [demand == 0 ? 0 : demand / (demand + supply)] / total claims
```

`demand` counts open requirements naming that exact skill; `supply` counts pool
members holding it at `p_eff ≥ 0.4`. Note two real behaviours: listing skills
nobody asks for actively *dilutes* scarcity (the divisor is all claims), and
duplicate skill rows inflate credibility's denominator without moving
versatility.

### Tunable constants

All in `lib/engine/types.ts:71-76` except the Guild Score weights.

| Constant | Value | Controls | Effect of moving it |
| --- | --- | --- | --- |
| `WEIGHTS.base` | **0.60** | coverage share of the score | The core claim. Raise it and Guild becomes a pure skill-matcher; lower it and a well-synced team of the wrong people out-ranks the right one. |
| `WEIGHTS.overlap` | **0.15** | shared availability | Raise it and calendars dominate; the anti-headcount result (negative marginal gain) strengthens, because adding anyone shrinks the intersection. |
| `WEIGHTS.balance` | **0.15** | experience variance | Raise it and senior+junior pairings go from a mild cost to a veto. |
| `WEIGHTS.commitment` | **0.10** | commitment spread | Smallest lever; raising it lets the flaky-teammate signal outweigh coverage. |
| `UNVERIFIED_DAMP` | **0.6** | multiplier on unproved claims | The credibility model. At 1.0 skill tags become gameable self-report; at 0.3 nearly every unverified claim falls under a floor and unproved people vanish. Surfaced as user-facing copy at `app/(app)/p/[handle]/page.tsx:290`. |
| `OVERLAP_TARGET_MINUTES` | **600** | overlap saturation (10 h/week) | Lower it and almost every team maxes overlap, killing the term's discrimination. |
| `UNMET_THRESHOLD` | **0.5** | "open gap" cutoff | Purely a *labelling* threshold — it never enters `score`. Controls `fills` vs `duplicates`, `unmet_requirement` risks, "still thin", and the gap pills. |
| `DEAD_ZONE_MINUTES` | **120** | availability dead-zone risk | Only affects one risk chip. |
| `PROFICIENCY_FLOOR` | **0.4** | "has the skill" cutoff | Used by scarcity supply-counting and by complementarity. **Not** used by `requirementCoverage`, which uses each requirement's own `minProficiency`. |
| `0.40 / 0.25 / 0.35` | Guild Score weights | credibility / versatility / scarcity | **Inline literals** at `guildScore.ts:33`, not hoisted. The test hardcodes them too. |
| `8` | versatility cap | `guildScore.ts:13` | Inline literal. |
| `autoDraft` `maxSize` | **6** default | max roster | `sandbox.tsx:130` overrides with `max(reqs+1, team+1)`. |
| `autoDraft` `minGain` | **0.005** | stop-drafting floor | At ≤ 0 the greedy loop seats people of zero or negative value until `maxSize`. |

`AGENTS.md` is right that these are product decisions, not tuning knobs: changing
one changes what the demo demonstrates.

---

## 3. Every screen

Status key: **Working** = does its job on the live deploy · **Demo-only** =
renders but its writes or data are dead · **Placeholder** = deliberately
unbuilt · **Broken** = renders something false · **Admin-gated** = redirects to
`/` for everyone in this build.

| Route | File | What it does | Status |
| --- | --- | --- | --- |
| `/` | `app/(app)/page.tsx` | 12 lines, `redirect('/teams')` | Working |
| `/teams` | `app/(app)/teams/page.tsx` | Team Board: "Squads looking for you" (gap feed, cap 4) + "All squads" | Working |
| `/teams/new` | `app/(app)/teams/new/page.tsx` | Honest static page saying the post-a-squad flow is unbuilt | **Placeholder** |
| `/squad/[id]` | `app/(app)/squad/[id]/page.tsx` + `components/team/sandbox.tsx` | The sandbox: score card, per-requirement slots, ranked candidates, auto-draft, Team X-ray | Working (client-only state) |
| `/people` | `app/(app)/people/page.tsx` | Directory of 40 profiles ranked by Guild Score | Working |
| `/p/[handle]` | `app/(app)/p/[handle]/page.tsx` | One person: Guild Score breakdown, skills with proofs, People you should meet, Squads that need you | Working |
| `/feed` | `app/(app)/feed/page.tsx` | Ranked event feed, tiered by relevance, stat tiles, filters | Working (degraded — see below) |
| `/events` | `app/(app)/events/page.tsx` | Flat paginated event list, sort by date or rank | **Broken — 0 results live** |
| `/hackathons` | `app/(app)/hackathons/page.tsx` | Deadline-keyed hackathon list, 25 live entries | Working (best surface) |
| `/calendar` | `app/(app)/calendar/page.tsx` | Day/week/month, scope mine/all | Demo-only (both scopes empty) |
| `/saved` | `app/(app)/saved/page.tsx` | Going / Saved / Past | Demo-only (permanently empty) |
| `/interests` | `app/(app)/interests/page.tsx` | Tag + preference picker | Demo-only (save always errors) |
| `/sources` | `app/(app)/sources/page.tsx` | Connector health dashboard | **Broken — "0 live" with 4 enabled sources** |
| `/settings` | `app/(app)/settings/page.tsx` | Account card, sign out, change password | Demo-only (both actions dead) |
| `/event/[id]` | `app/(app)/event/[id]/page.tsx` | Full event detail, ICS + Google Calendar, share | Working |
| `/event/[id]/ics` | `app/(app)/event/[id]/ics/route.ts` | Private ICS download | Working |
| `/e/[id]` | `app/e/[id]/page.tsx` | Public share page, indexable, redacted columns | Working — but its signed-out branch is unreachable |
| `/e/[id]/ics` | `app/e/[id]/ics/route.ts` | Public ICS, `max-age=300` | Working (verified live) |
| `/login` | `app/login/page.tsx` | Email + password form | Demo-only — 200, always `?error=badcreds` |
| `/auth/signout` | `app/auth/signout/route.ts` | POST → 303 to `/login` | Vestigial |
| `/welcome` | `app/(app)/welcome/actions.ts` | **404** — the directory has `actions.ts` and no `page.tsx` | Broken |
| `/admin` | `app/(app)/admin/page.tsx` | Account list, create account, audit log | **Admin-gated** |
| `/admin/add` | `app/(app)/admin/add/page.tsx` | Paste-to-event via LLM extraction | **Admin-gated** |
| `/admin/discovery` | `app/(app)/admin/discovery/page.tsx` | Google CSE leads triage | **Admin-gated** |
| `/design` | `app/(app)/design/page.tsx` | 349-line living style guide | **Admin-gated** (and nothing links to it) |

Supporting files: `app/layout.tsx` (the only layout — there is no
`app/(app)/layout.tsx`), `app/(app)/loading.tsx` (one route-group skeleton,
shaped like the old Olvable feed, shown on Guild routes too), `middleware.ts`
(pass-through), `app/robots.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`,
`app/icon.svg`.

Feed degradations, all traced to two missing Postgres functions (§6d): the
source chips never render, the HealthStrip renders nothing, "New" is always 0
and "Mark all N seen" is never shown. The `?all=1` below-60 drawer and the
"N filtered out" counter never render either, because every seeded event scores
60–97 and every seeded row is `status = 'active'`.

---

## 4. The Guild half

### 4a. The engine — `lib/engine/`

11 files, 469 lines. **It imports nothing**: every import is a relative sibling.
No React, no Supabase, no Node, no date library, no `@/`. Verified by grep —
zero violations, and also no `Date`, `new Date`, `Math.random`, `process.`,
`globalThis` or `require(` anywhere in the directory. Every ordering has an
explicit id-ascending tiebreak, so the same code produces byte-identical results
on the server and in the browser. That is what lets `components/team/sandbox.tsx`
re-score on every click with no round trip.

`lib/engine/index.ts` is the public surface: `export * from './types'` plus 13
named exports.

| File | Exports | What it does |
| --- | --- | --- |
| `types.ts` | `AvailabilityWindow`, `SkillClaim`, `Member`, `Requirement`, `CoverageEntry`, `TeamScore`, `MarginalGain`, `Risk`, `GuildScore`, and all 6 tunable constants | Types plus the constants table in §2 |
| `coverage.ts` | `effectiveProficiency`, `requirementCoverage` | The damp and the probabilistic-OR. **Skill matching is exact string equality** — `'React' ≠ 'react'`, and no normalisation layer exists anywhere in the codebase |
| `availability.ts` | `sharedMinutesPerWeek` | Per day 0–6, merge each member's windows into minute intervals, fold a pairwise intersection across all members, sum. Malformed `"HH:MM"` yields `NaN`, which the `end > start` filter drops — one bad window, not a poisoned week |
| `score.ts` | `scoreTeam` | The headline equation; `base = 0` when total weight is 0; solo exemptions |
| `marginal.ts` | `marginalGain`, `rankCandidates` | Two full `scoreTeam` calls per candidate. Labels `fills` vs `duplicates` against the *before* coverage, independently of the sign of `delta`. **`delta` can be negative** — an extra body who fills nothing drops the team out of the solo exemptions |
| `autodraft.ts` | `autoDraft`, `type DraftPick` | Greedy over `rankCandidates`; breaks when no candidate or `delta < minGain`. `maxSize` counts pre-seated members |
| `risk.ts` | `teamRisks` | The Team X-ray: `unmet_requirement` (high iff `weight ≥ 2`), `bus_factor` (always high), `availability_dead_zone` (< 120 min, team ≥ 2), `commitment_gap` (spread ≥ 3) |
| `guildScore.ts` | `guildScore` | The individual score in §2 |
| `recommend.ts` | `complementarity`, `peopleYouShouldMeet`, `gapFeed`, `type Complementarity` | The social layer. Two clones score complementarity exactly 0; two disjoint stacks exactly 1. `gapFeed` is the feed flipped — projects ranked by *your* marginal gain, filtered to `delta > 0`, excluding projects you are on |
| `explain.ts` | `explainScore` | Human-readable lines: `'react: 90% via Aarav'`, `'Designer: open gap'`, `' — still thin'`. **Zero callers.** |
| `__tests__/engine.test.ts` | — | 41 tests, 11 groups |

Two non-null assertions to know about: `risk.ts:11` and `explain.ts:18` both do
`ts.coverage.find(...)!` and will throw if a caller passes a different `reqs`
array to the consumer than it passed to `scoreTeam`.

Cost: `marginalGain` is two full team scores; `rankCandidates` calls it per pool
member; `autoDraft` calls `rankCandidates` per pick. O(picks × pool × reqs ×
team). Fine at 40 people; `/squad/[id]` caps the pool at `.limit(200)`.

### 4b. The mapper — `lib/team/mappers.ts`

114 lines, no runtime imports (type-only from `@/lib/engine`), 23 tests in
`lib/team/mappers.test.ts`. This is the **intended** single DB→engine seam.

Exports the row types `ProfileRow`, `SkillRow`, `RequirementRow`; the column
constants used to build the actual `.select()` strings (`PROFILE_COLUMNS`,
`SKILL_COLUMNS`, `REQUIREMENT_COLUMNS`); and `toWindows`, `toSkillClaim`,
`toMember`, `toRequirement`, `groupSkills`.

Every defensive coercion, and why:

| Coercion | Behaviour | Why |
| --- | --- | --- |
| `num(value, fallback = 0)` | string → Number, then `Number.isFinite` or fallback | PostgREST returns `numeric` as `number` from some drivers and `string` from others |
| `level(value)` | `Math.round(num(value, 3))` clamped to 1–5 | A bad row must not crash a page; missing defaults to the middle |
| `toWindows(raw)` | jsonb is untrusted: non-array → `[]`; per item drop unless `day` rounds into 0–6 and both `start`/`end` are strings | Sunday (day 0) survives; the `"HH:MM"` format is *not* validated here — malformed strings are dropped later by `availability.ts` |
| `toSkillClaim(row)` | `verified = proof_url !== null && proof_url !== ''` | An empty proof URL is not proof — explicitly tested |
| `toRequirement(row)` | **`weight: Math.max(0.0001, num(row.weight, 1))`** | `scoreTeam` divides by total weight; a zero would poison every score on the page |
| `groupSkills(rows)` | one pass bucketing by `profile_id` | So callers do not rescan per member |

**The single biggest divergence in the codebase: there are three copies of this
mapper, and only one is tested.**

- `lib/team/mappers.ts` — used only by `/people` and `/p/[handle]`.
- `app/(app)/squad/[id]/page.tsx:56-95` — its own `num`, `level`, `toMember`,
  `toRequirement`. **`weight: num(r.weight)` with no clamp and no fallback**, and
  `availability: p.availability_windows ?? []` blind-cast to
  `AvailabilityWindow[]`.
- `app/(app)/teams/page.tsx:40-48, 102-131` — its own `level` and `windows`
  (`Array.isArray(v) ? v as AvailabilityWindow[] : []`), and inline
  `weight: r.weight ?? 1` with **no zero clamp**.

So a `weight: 0` row would divide-by-zero on two of the four Guild pages and be
safely clamped on the other two.

`lib/demo.ts` supplies "who am I": `DEMO_PROFILE_HANDLE = 'aarav'`, wrapped in
React `cache()`, degrading to `null` on any query error (9 tests in
`lib/demo.test.ts`). Its docstring claims it feeds the profile screen and
People You Should Meet; it does not — its **only** caller is
`app/(app)/teams/page.tsx:165`, and `/p/[handle]` derives identity from the URL.

### 4c. The four screens

**`/teams` — the Team Board.** Five flat selects in one `Promise.all`
(deliberately joined in memory rather than through a PostgREST embed), plus a
sixth conditional `events` lookup. Membership uses a **deny-list**
(`pending, invited, requested, declined, rejected, left`); the owner is force-added
regardless. Then `gapFeed(me, squads)` sliced to `GAP_FEED_LIMIT = 4` for the
"Squads looking for you" rail, and every card independently calls `scoreTeam`.

`components/team/squad-card.tsx` renders **`score.base` only** — pure coverage,
not the composite — banded by `readiness()`: ≥85 Ready, ≥60 Getting there, ≥35
Thin, else Needs people. "Needs" pills are requirements under `UNMET_THRESHOLD`,
capped at 4. Face pile capped at 4 with a `role="img"` roster label.

Live behaviour worth knowing before a demo: the for-you rail shows **1** card,
not 4, and that squad is then rendered **a second time** in "All squads" — the
board duplicates anything in the rail, with a different pastel because `index`
restarts per grid. And Fraud-lens reads **"0 · Needs people"** on the board
(that is `base`) but **40%** in the sandbox (that is `score`, with the solo
exemptions). Same squad, two numbers, no explanation on either screen.

**`/teams/new`.** Static, no data fetch, not a client component. Three `DataRow`s
explaining what a squad post would need, two working links. Honest, and the only
Guild page whose `<Page>` does not carry `role="main"`.

**`/people`.** Three parallel selects using the shared column constants, then
`guildScore(pool[i], pool, openReqs)` per profile — **all** requirements in the
community, which is the demand side of scarcity. Sorted by total desc, id asc.
Skill pills pre-sorted verified-first. 40 cards live; top is Meera Pillai at 65.
No search, no filter, no sort control. Complexity is O(people × skills × people).

**`/p/[handle]`.** Five parallel unscoped selects; the handle is matched **in
memory**. Renders the Guild Score as four nested `role="meter"` elements (total
plus credibility/versatility/scarcity), a "Why the scarcity score" section built
from the engine's real `demand`/`supply` counts, skills with `See the proof`
links, `peopleYouShouldMeet(me, pool, 3)`, and `gapFeed(...).slice(0, 3)`. It
prints `UNVERIFIED_DAMP` literally in the copy. It uses an **allow-list**
(`status === 'accepted'`) where `/teams` uses a deny-list — so an `invited`
member counts on the board and not here.

### 4d. What the sandbox actually does

`components/team/sandbox.tsx`, 556 lines, `'use client'`. Layout is
`grid lg:grid-cols-[1fr_340px]`; **the candidate list is rendered twice in the
DOM** (once `lg:hidden`, once in the sticky aside), so every candidate button and
`aria-label` is duplicated to assistive tech.

Every render, unmemoized, it calls `scoreTeam`, `rankCandidates(...).slice(0, 10)`
and `teamRisks`. During auto-draft that re-runs over the whole 40-person pool
every 420 ms.

| Control | Handler | Effect |
| --- | --- | --- |
| Candidate row | `add(id)` | Appends to `teamIds`. Does **not** stop an in-flight draft |
| `X` on a contributor chip | `remove(id)` | No-ops for the owner; stops any draft; filters the id out |
| Auto-draft | `runDraft()` | Disabled while drafting; label flips to "Drafting" |
| Reset | `reset()` | Stops the draft and restores `initialTeamIds`. **The only way to abort a draft** |

Auto-draft mechanics, precisely: it computes the *whole* greedy run up front via
`autoDraft(pool, requirements, { start: team, maxSize: max(reqs+1, team+1) })`,
with `minGain` left at the engine default of 0.005. If `picks.length === 0` it
returns silently with **no feedback at all**. Under `prefers-reduced-motion:
reduce` it applies every pick in one `setTeamIds`. Otherwise a `setInterval` at
`DRAFT_STEP_MS = 420` applies one pick per tick, with one extra idle tick after
the last pick before the button re-enables. There is **no Stop control**.

**Everything the sandbox does is client-only and lost on refresh.** `teamIds`,
`drafting` and the aria-live announcement string are React state. There is **no
server action anywhere in the repo that touches `memberships`, `projects` or
`requirements`** — `app/(app)/actions.ts` exports only `setEventState`,
`markSeen`, `markAllSeen`, all Olvable event actions. There is no Join, no
Invite, no Nudge, no Save in the entire Guild surface. Guild is read-only.

Two gaps in the sandbox worth naming:

1. **The "N on the roster" pill is server-rendered outside the client
   component** (`squad/[id]/page.tsx`), so it never updates. Add three people and
   it still reads "1 on the roster".
2. **A member who covers nothing cannot be removed.** Removal is reachable only
   through a covered slot's contributor chip. An open slot lists no contributors
   and offers no action, and there is no roster list. Auto-draft can seat exactly
   such a person; only Reset clears them.

---

## 5. The Olvable half

### 5a. Connectors

Registry: `lib/connectors/index.ts`, 10 connectors. Interface in
`lib/connectors/types.ts`:

```ts
interface Connector {
  id: string
  needsLLM: boolean
  volatileFields: string[]
  fetchRaw(ctx: FetchContext): Promise<FetchResult>
  toEvent?(raw: RawListing): PartialEvent | null
}
```

| id | Source and method | Kind | Enabled | Notes |
| --- | --- | --- | --- | --- |
| `devfolio` | `POST api.devfolio.co/api/search/hackathons`, JSON | deadlines | yes | The only source with both a real start and a deadline; structured country makes it the strongest geo signal |
| `devpost` | `GET devpost.com/api/hackathons`, JSON, paged | deadlines | yes | **No timestamps at all** — `submission_period_dates` is a display string parsed by `parseRangeBorrowingContext` |
| `unstop` | `GET unstop.com/api/public/opportunity/search-result` × 3 types | deadlines | yes | `end_date` is registration close, not a start. Drops `quizzes` in `toEvent` |
| `allevents` | `allevents.in/chennai/<category>` × 7, HTML → JSON-LD | events | yes, `feedOptIn` | Never touches the DOM, only schema.org |
| `luma` | `lu.ma/<slug>` → `api.lu.ma/ics/get`, iCal via `node-ical` | events | yes | The awkward one — see below |
| `knowafest` | `knowafest.com/explore/state/Tamil-Nadu`, cheerio table | events | yes, `feedOptIn` | Rows are `<tr onclick="window.open(...)">` |
| `gdg` / `figma` / `mulesoft` | Bevy chapters via `__NEXT_DATA__` | events | yes, `sparse` | One implementation: `makeBevyConnector()` in `lib/connectors/bevy.ts` |
| `eventbrite` | 3 pages of `eventbrite.com/d/india--chennai/all-events/`, JSON-LD | events | **no** | Complete and tested; switched off in config and omitted from the workflow loop |

**No connector needs an LLM** — every one sets `needsLLM: false` and supplies
`toEvent`, so the `!connector.toEvent` LLM-normalisation branch in
`scripts/ingest.ts` is unreachable dead code.

`config/sources.ts` lists **13** sources; three (`manual`, `ocgroups`, `tie`)
have config and no connector. `manual` is by design (`/admin/add`); the other two
were never built, and their date-format tables (`OCGROUPS_FORMATS`,
`TIE_FORMATS` in `lib/dates/sources.ts`) are orphaned alongside
`DAY_FIRST_FORMATS`.

The Luma connector is the one carrying the most hard-won detail: ICS has no URL,
so `eventUrlOf()` digs the vanity link out of `DESCRIPTION`, then `LOCATION`,
then falls back to a synthesised URL; recurring series expand via
`rrule.between()` over a 120-day horizon with `sourceUid = uid::YYYY-MM-DD`
(without which six occurrences collapse to one row); and a `seen` set lives
*outside* the calendar loop because aggregators cross-post and a duplicate inside
one batch makes Postgres reject the whole upsert. `config/luma-calendars.ts`
holds **50 hand-curated calendars** in four tiers, curated by hand because Luma
has no Chennai discover page and its API is Plus-gated.

### 5b. The ingest pipeline

`scripts/ingest.ts`, invoked `npm run ingest -- <source> [--force]`. Constants:
`STALE_RUN_MINUTES = 10`, `MAX_LISTINGS_PER_RUN = 400`.

1. `assertProdWritesAllowed('ingest')` (`scripts/guard.ts`) — CI is exempt via
   `GITHUB_ACTIONS`; locally you need `ALLOW_PROD_WRITES=true`.
2. Reap stale `running` rows older than 10 min to `error` — without it a crashed
   run reads as busy forever.
3. Claim a run. Concurrency is the partial unique index
   `scrape_runs_one_active on scrape_runs(source_id) where status='running'`; a
   `23505` means another run is live and the script exits 0 cleanly.
4. Fetch through `createFetcher()` in `lib/http/fetcher.ts` — the **only**
   outbound HTTP path. Per-host crawl delay shared across connectors,
   `maxRetries = 3`, `timeoutMs = 30_000`, `429` honours `Retry-After`, `5xx`
   backs off, `4xx` throws immediately and is never retried under a different
   identity. `HONEST_UA = 'olvable/0.1 (personal event aggregator; +https://olvable.vercel.app)'`.
5. **Persist raw unconditionally** into `raw_listings`, keyed
   `(source_id, source_uid, content_hash)` with `ignoreDuplicates`. This is what
   makes a later extraction fix replayable without re-scraping.
6. Normalise via `connector.toEvent`; `null` counts as dropped.
7. Quality gates (§5d). On failure the *event upsert is skipped* and raw payloads
   are kept.
8. Upsert `events` on `(source_id, source_uid)`, deliberately omitting
   `first_seen_at` and `seen_at` so an update never resets them.
9. Persist the cursor; run the first-backfill guard so day one's whole corpus is
   not flagged NEW; finish the run with `listings_found` and a `quality_gate`
   jsonb.

**Two different hashes, both in `lib/hash.ts`, both sha256 truncated to 32 hex
over a `stableStringify`.** `contentHash(payload, volatileFields)` writes
`raw_listings.content_hash` and deep-omits declared volatile keys (Devpost's
`time_left_to_submission` would otherwise mint a fresh raw row per hackathon per
day). `scoringHash({title, description, tags, eventType})` writes
**`events.content_hash`** and deliberately excludes url, venue and every
timestamp so a venue correction costs no LLM call. The naming is a trap: the
column called `content_hash` on `events` is written by `scoringHash`, not by
`contentHash`.

**Dedupe — three mechanisms, two live.** Per-run `seen` sets inside connectors;
database uniqueness on `(source_id, source_uid)` and
`(source_id, source_uid, content_hash)`; and `collapseDuplicates()` in
`lib/queries/shared.ts:176`, a request-time in-memory collapse keyed on
`title_norm|YYYY-MM-DD` that surfaces as the "+N listings" badge. The third
designed mechanism — union-find over `event_duplicate_links`
(`supabase/migrations/0001_init.sql:198-215`) — is **written and read by
nothing**, and the table has 0 rows. `canonical_url` is populated and indexed and
described in the migration as "the strongest dedupe signal by a wide margin", and
no code dedupes on it.

**Dates — `lib/dates/`.** The hard rule stated in `parse.ts`: **`new Date(string)`
never touches source data**, because Node reads `"03/04/2026"` as March 4 and
every Indian DD/MM date with day ≤ 12 becomes a plausible wrong date nothing
would flag. `MM/dd/yyyy` is deliberately absent from every format table.
`ParsedDate = { local, tz, utc, precision }` — render from `local` +
`precision`, never from `utc`, which exists only so Postgres can sort and
range-filter. `DEFAULT_TZ = 'Asia/Kolkata'`; a missing offset reads as IST, which
is what keeps evening AllEvents entries on the right day.

### 5c. Relevance scoring

`lib/pipeline/relevance.ts` + `scripts/score.ts` + `lib/llm/provider.ts`.

Providers, tried in order, first success wins: **Gemini**
(`gemini-3.5-flash-lite`, `temperature: 0`, real `responseSchema` structured
output) then **Groq** (`openai/gpt-oss-120b`, `response_format: json_object`;
its `call<T>` ignores the schema argument, so the prompt has to restate the
shape). One key each, deliberately — Groq's limits are org-level so extra keys
multiply nothing. Token-bucket pacing ahead of the call at `TPM_BUDGET = 8_000`
tokens/minute, `estimateTokens = ceil(len / 3.5)`, sleeping out the window
rather than reacting to 429s.

The interest profile lives in **git, not the database** (`config/interest-profile.ts`)
precisely so `PROFILE_HASH = sha256(JSON.stringify(INTEREST_PROFILE)).slice(0,16)`
cannot drift from the content. It holds 5 priority topics, 33 `strongKeywords`,
~75 `negativeKeywords` in four buckets (consumer entertainment, sport/fitness,
retail expos, clinical/academic-only), and a six-line persona.
`SCORING_VERSION = 3`, `NORMALIZER_VERSION = 1`.

Scoring runs cheapest-first:

1. `keywordPass(e)` over title+description+venue+eventType+tags. Any negative
   keyword → score 2. Two or more strong keywords → `min(92, 70 + hits·4)`.
   Otherwise fall through.
2. `llmScoreBatch(batch)`, one call per 12 events, with four hard anchors in the
   prompt (85–100 founders/investors; 60–84 strong professional; 30–59
   tangential; 0–29 general-public and generic commercial). Hallucinated indices
   are skipped, scores clamped 0–100, reasons truncated to 12 words in code as
   well as in the prompt, because a long reason breaks the phone card layout.
3. `applyModeAdjustment(score, isOnline)` subtracts `ONLINE_PENALTY = 25`
   *after* scoring, outside the prompt, so it is consistent and auditable.

Rescore triggers, from `scripts/score.ts`: null score, changed `PROFILE_HASH`,
changed `SCORING_VERSION`, changed `SCORING_MODEL`, or
`scored_content_hash !== content_hash`. Budget guards `BATCH_SIZE = 12`,
`MAX_LLM_CALLS = 40`. `manual` events are excluded — `buildManualRow` hard-sets
score 85 / reason "Hand-picked", because the human deciding an event matters *is*
the relevance judgment.

One caveat: staleness compares `scoring_model` against the **constant**
`SCORING_MODEL` (`'gemini/…'`), while `llmScoreBatch` returns the provider
actually used. Anything scored through the Groq fallback is re-flagged stale on
every subsequent run until Gemini scores it.

A separate, **live** layer sits at request time: `lib/ranking.ts` computes
`rank = quality × (0.7 + 0.3 × fit)` per user with no SQL and no per-user LLM,
plus a free + in-person + premium-venue floor of 82 (`lib/venues.ts`). It is
wired and running — but `fit` is always `0.5` in this build because interests
can never be saved (§7), so `rank === relevance_score` always.

### 5d. Geo and quality filtering

**Nothing is deleted at ingest.** `events.status` is
`active | past | filtered_geo | filtered_quality | delisted`, and filtering
happens at query time so the "Filtered out (N)" drawer can prove nothing real was
thrown away. In practice only `active` and `filtered_geo` are ever written;
`filtered_quality`, `past`, `delisted` and `missing_run_count` are declared and
written by nothing.

`lib/pipeline/geo.ts` `classifyGeo(input, { requireLocal })` uses four regex
tables — `IN_SCOPE` (13 Tamil Nadu places), `ONLINE` (5), `OUT_OF_SCOPE` (~85
Indian and international cities), and `LOCAL_ANCHORS` (13 non-place names:
freshworks, zoho, tidel park, iit madras, anna university, ssn, srm…). Decision
order: online wins; a structured non-India country filters definitively; then
online / in-scope / anchor / out-of-scope over city+venue+title (plus description
only when `requireLocal` is false); no signal defaults to **keep**.

**The asymmetry is the whole design.** Something is filtered only when positively
recognised as elsewhere, never merely for failing to be recognised as local — a
false positive costs one line in a list you are already scanning, while a false
negative is invisible by construction. The `LOCAL_ANCHORS` list exists because
the first live run dropped a real Chennai hackathon held at "Freshworks", a venue
string with no geographic signal. `requireLocal` flips the default for national
(`kind: 'deadlines'`) sources only.

`lib/pipeline/quality.ts` `evaluateGates()` runs four checks with thresholds
`MIN_TITLE_LEN = 5`, `TITLE_RATIO = 0.8`, `DATE_RATIO = 0.6`,
`COUNT_LOWER = 0.4`, `COUNT_UPPER = 2.5`, `MAX_CHURN = 0.5`. Its header states
the real threat model: the failure everyone designs for is a scraper returning
zero rows; the failure that actually happens is a changed selector returning
forty rows with empty titles, which passes a count check. `--force` waives
**only** volume and churn — titles and dates stay enforced.

### 5e. The scripts

All in `scripts/`, all run through `tsx` (so **no top-level await** — every one
wraps in `main()`), all `import './load-env'` first.

| Script | Command | Writes? | Status here |
| --- | --- | --- | --- |
| `ingest.ts` | `npm run ingest -- <src>` | yes, guarded | Wired to CI; **never run against this DB** |
| `score.ts` | `npm run score` | yes, guarded | Wired; **dormant** (no LLM keys) |
| `seed.ts` | `npm run seed` | yes, guarded | Pushes `config/sources.ts` → DB. **Never run here** |
| `reclassify.ts` | `npm run reclassify -- --all [--dry]` | yes, guarded | Operator tool; re-applies the current geo rule to stored rows |
| `connector-test.ts` | `npm run connector:test -- <src>` | **no** | **Runnable right now** — no DB, no keys. The best way to prove the connectors are real |
| `luma-check.ts` | `npm run luma:check` | no | **Runnable right now** |
| `healthcheck.ts` | `npm run healthcheck` | no | Would exit 1 here — all sources report "last ok: never" |
| `discover.ts` | `npm run discover` | yes, guarded | **Clean no-op** with no CSE keys, deliberately |
| `guard.ts` | (imported) | — | `prodWritesAllowed(env)`, 5 tests |
| `create-user.ts`, `grant-admin.ts` | — | — | **Unrunnable** — need a service-role key that does not exist here |

`connector-test.ts`'s header claims "A weekly CI job runs it for every source."
**No such workflow exists** in `.github/workflows/`.

### 5f. What is dormant in this deployment

The pipeline is a complete, well-tested, well-documented batch system that **is
not running here.** Verified against the live database: `scrape_runs` = 0 rows,
`raw_listings` = 0 rows, `sources` = 4 rows (not the 13 in config),
`app_state.profile_hash = ''`. Sample event rows carry `scoring_model: null`,
`profile_hash: null` and an identical `relevance_reason` string.

The 25 events the live app serves came from a **second, parallel implementation**:
`ingest/fetch-events.mjs` (zero-dependency ESM, `PER_SOURCE_CAP = 10`,
`TOTAL_CAP = 25`, its own Devpost range parser, its own dedupe by
`external_url`) writing `ingest/events.json`, loaded by `seed/seed-demo.mjs`.

Two things about it deserve a decision, not silence:

1. **It sends a fake Chrome user agent** (`BROWSER_UA = 'Mozilla/5.0 … Chrome/126.0.0.0 …'`),
   directly contradicting the honest-UA policy stated in `config/sources.ts` and
   `lib/http/fetcher.ts` — which records that a browser-impersonating path was
   *removed* in a previous session.
2. **It performs no geo classification at all.** `seed-demo.mjs` defaults `city`
   to `'Chennai'` for anything in-person, so the corpus is labelled Chennai
   regardless of where it is. `HackNex Season 2` in `ingest/events.json` is at
   "JIS College of Engineering, … Kalyani, West Bengal" — a row `classifyGeo`
   would have marked `filtered_geo`. The feed's own copy says "N events across
   Tamil Nadu" while listing Bhopal, Jaipur, Kalyani and Kochi.

---

## 6. Data model

The demo database is `https://fjxgqiveolnnrslihodl.supabase.co`. **It was built
by hand.** Nothing in the repo applies either SQL directory to it, and the
schema has demonstrably diverged (see 6c and 6e).

### 6a. Olvable's tables — `supabase/migrations/0001–0013`

| Table | Purpose | Live rows | Status |
| --- | --- | --- | --- |
| `sources` | `id` (PK text), `display_name`, `enabled`, `crawl_delay_ms`, `user_agent`, `cursor` jsonb, `default_audience` text[], `created_at`. Runtime copy of `config/sources.ts` | **4** — devfolio, devpost, unstop, manual, all enabled | Wired |
| `scrape_runs` | `id` bigserial, `source_id`, `started_at`, `finished_at`, `status`, `listings_found`, `llm_calls`, `quality_gate` jsonb, `http_status`, `error`. Partial unique index on `(source_id) where status='running'` | **0** | Wired, empty. `llm_calls` is never incremented |
| `raw_listings` | `id`, `source_id`, `source_uid`, `run_id`, `payload` jsonb, `content_hash`, `fetched_at`, `normalizer_version`, `normalized_at`, `normalize_error` | **0** | Orphaned in this build |
| `events` | The corpus. 44 columns: `id, source_id, source_uid, raw_listing_id, title, title_norm, description, url, canonical_url, organizer, organizer_norm, starts_at_local, ends_at_local, tz, starts_at, ends_at, registration_deadline, date_precision, date_kind, is_online, city, area, venue, event_type, tags, audience, goal_fit, price_type, price_amount, price_currency, content_hash, relevance_score, relevance_reason, relevance_scored_at, profile_hash, scoring_version, scoring_model, scored_content_hash, image_url, status, seen_at, missing_run_count, first_seen_at, last_seen_at`. Unique `(source_id, source_uid)` | **25**, all `active` (devpost 10, devfolio 10, unstop 5) | Wired — read by every Olvable query and by `projects.event_id` |
| `event_duplicate_links` | `(a_id, b_id)` PK, `check (a_id < b_id)`, `score`, `method`, `computed_at` | **0** | **Orphaned** — nothing writes or reads it |
| `event_actions` | Pre-multi-user single-user state | **0** | Orphaned by design (superseded in 0005) |
| `mute_rules` | Global deterministic mutes | **0** | Orphaned — nothing reads it |
| `app_state` | Singleton: `profile_hash`, `scoring_version`, `normalizer_version`, `first_backfill_done` | 1 row, `profile_hash = ''` | Read only by scripts, never by the app |
| `user_event_actions` | PK `(user_id, event_id)`, `state ∈ interested/registered/going/skipped/attended`, `note`. FK → `auth.users(id)` | **0** | Wired for reads; **writes cannot succeed** |
| `user_event_seen` | PK `(user_id, event_id)`, `seen_at`. FK → `auth.users` | **0** | Same |
| `user_interests` | PK `user_id`, `tags` text[], `prefs` jsonb, `seed_event_ids` uuid[], `completed_at` | **0** | Same |
| `user_source_mutes` | PK `(user_id, source_id)` | **0** | Same |
| `access_audit` | Append-only admin trail | **0** | Reachable only from `/admin` |
| `discovery_leads` | Weekly CSE sweep output, unique on `url` | **0** | Reachable only from `/admin/discovery` |
| `invited_emails` | **Dropped by migration 0012 — still exists on the live DB** | 0 | Orphaned, and hard proof of schema drift |

Roles are not a table: migration 0008 records that they live in
`auth.users.raw_app_meta_data->>'role'`.

### 6b. Guild's tables — deployed reality

| Table | Live columns | Live rows |
| --- | --- | --- |
| `profiles` | `id, user_id, handle, name, dept, year, bio, experience_level, commitment_level, availability_windows, looking_for, is_seed, created_at` | **40** |
| `skills` | `id, profile_id, skill, proficiency, proof_url`. Unique `(profile_id, skill)` | **75** |
| `projects` | `id, owner_profile_id, event_id, title, description, kind, effort, deadline, is_seed, created_at` | **5** |
| `requirements` | `id, project_id, skill, role_label, weight, min_proficiency` | **17** |
| `memberships` | `id, project_id, profile_id, status ∈ invited/accepted`. Unique `(project_id, profile_id)` | **7** |

### 6c. `supabase/guild/*.sql` is fiction relative to what runs

`docs/ARCHITECTURE.md` is honest about this; the SQL files are not. Verified
column-by-column over PostgREST:

- The live `profiles` has **`looking_for`**, which `0001_schema.sql` does not
  declare. `seed-demo.mjs` writes it; nothing in `app/` or `lib/` reads it.
- The live `projects` has **`kind`** and **`effort`** (not in the SQL) and
  **lacks `community_id`** (which the SQL declares — `?select=community_id`
  returns HTTP 400). `kind` and `effort` are seeded and read by nothing.
- `communities` and `community_members` **do not exist**
  (`PGRST205: Could not find the table`). They are referenced by nothing in the
  app either.
- The SQL declares a **second `public.events`** with
  `source/external_url/host/mode/location/deadline_at/posted_by_profile_id`.
  It was never applied — `?select=mode`, `?select=posted_by_profile_id` and
  `?select=deadline_at` all return 400. **This file cannot be applied on top of
  the migrations; it would collide with Olvable's `events`.**
- `seed-demo.mjs` upserts projects on `title`, which requires a unique
  constraint on `projects.title` that the SQL file does not declare.
- `0002_rls.sql` **cannot run at all**, because it does
  `alter table public.communities`.

### 6d. Two missing database functions — the most visible live bug

Two Postgres functions are declared in the migrations and called by the app, and
**neither exists on the demo project**:

- `public.unseen_active_count(p_user uuid, p_floor int, p_sources text[])` —
  migration `0006_auth_helpers.sql`
- `public.source_health()` returning
  `(id, display_name, enabled, event_count, last_status, last_ok_at)` — created
  in `0007_dashboard_perf.sql`, replaced in `0011_source_health_deadlines.sql`

supabase-js puts the `PGRST202` error in `error` and leaves `data` null, so
`(healthRows ?? [])` becomes `[]` and every consumer fails **silently**.
Observable consequences on the live site:

- `/sources` renders "0 live. … No live sources — Nothing is enabled. The seed
  decides that." while four enabled sources sit in the table. That is a flat lie
  on a page a reviewer will open.
- `/feed` renders "New 0 since you looked" and "0 of 0 sources live", shows no
  source chips, and never renders the "Mark all N seen" button or the
  HealthStrip. Meanwhile `/hackathons`, which reads the `sources` table directly
  via `getSourceChips`, shows Devfolio · Devpost · Unstop correctly.

Fix: run the three `create or replace function` blocks against
`fjxgqiveolnnrslihodl` with a service role.

### 6e. Deployed RLS versus the SQL files

**They disagree, badly, and in the dangerous direction.**

What the SQL claims: `0001_init.sql` enables RLS on all 8 Olvable tables with
**zero policies** (deny all) and revokes all from `anon, authenticated`, with a
header explaining that otherwise "anyone who loads the dashboard could DELETE
FROM events through PostgREST". `0005`, `0009`, `0010` add owner-scoped policies
keyed on `auth.uid()`. `supabase/guild/0002_rls.sql` describes careful
ownership-scoped policies for every Guild table.

What is deployed, verified by GET with the committed publishable key and no auth
header: **every table returns HTTP 200.** `sources`, `events`, `app_state`,
`profiles`, `skills`, `projects`, `requirements` and `memberships` return their
full contents. The rest return 200 with 0 rows because they are empty — which
confirms readability, not protection.

So **every Olvable table is world-readable through a key committed to a public
GitHub repository**, which is broader than `SECURITY.md` admits (it mentions
only the Guild tables). `SECURITY.md` further states the Guild tables are
world-**writable**; that was not independently verified in the survey (the write
probe was blocked) and should be assumed true until someone with the service role
inspects `pg_policies`.

The mitigations are real: the database is disposable, holds no real personal
data, and Shaan's production Olvable project (`gxxhjmwgxmjhmhtnipua`) is a
separate project never referenced by this build. The residual risk is concrete:
**anyone can rewrite the demo before a judge looks at it**, and the seed script
is the only recovery.

---

## 7. Auth and security

### The exact posture

**`middleware.ts`** is a pass-through — the body is `return NextResponse.next()`.
Its matcher is kept explicit (`['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)']`)
because Next treats an empty matcher array as unset and would then run it on
static assets.

**`lib/auth/server.ts`** returns a hard-coded `DEMO_USER` unconditionally:

```ts
const DEMO_USER_ID = process.env.DEMO_USER_ID ?? '00000000-0000-4000-8000-000000000001'
// email: 'demo@olvable.app', app_metadata: { provider: 'demo', role: 'member', onboarded: true }
```

`getSessionUser()` never returns null, so all twenty-odd
`if (!user) redirect('/login')` call sites fall through. The `created_at` /
`updated_at` are fixed literals rather than `Date.now()` so render output stays
deterministic.

**Authorization is genuinely intact.** `lib/auth/roles.ts` `roleOf(user)` reads
`app_metadata.role`, `isAdmin()` compares it to `'admin'`, and the stand-in user
is a `member`. `requireAdmin()` asserts rather than assumes:

```ts
export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) redirect('/')
  return user
}
```

### What is open and what is closed

| Surface | Guard | Verified live |
| --- | --- | --- |
| Every non-admin route (26 of them, including `/login`) | none | **200, open to anyone with the URL** |
| `/admin` | `requireAdmin()` | **Closed** — serves the Team Board |
| `/admin/add` | page-level role check + `requireAdmin()` in its actions | **Closed** |
| `/admin/discovery` | same | **Closed** |
| `/design` | `requireAdmin()` | **Closed** |
| 7 admin server actions in `app/(app)/admin/**/actions.ts` | `requireAdmin()` on each | **Closed** |

Server actions are their own HTTP entry points, so the check living inside
`requireAdmin()` closes all seven at once rather than depending on a page guard.
This is the one place the demo posture is enforced correctly.

**Non-admin server actions are open to any anonymous visitor**: `setEventState`,
`markSeen`, `markAllSeen` (`app/(app)/actions.ts`), `setSourceMuted`
(`sources/actions.ts`), `completeOnboarding` (`welcome/actions.ts` — reachable
only as a bare action endpoint, since `/welcome` is a 404), `changePassword`
(`settings/actions.ts`).

### Every per-user write path is dead

`user_event_actions`, `user_event_seen`, `user_interests` and `user_source_mutes`
all carry `references auth.users(id) on delete cascade`. `seed-demo.mjs` writes
nothing into `auth.users`, and `DEMO_USER_ID` is not set in `.env.local`, so
every write is a foreign-key violation.

**None of the write paths check the returned error.** `app/(app)/actions.ts` does
`await db.from('user_event_actions').upsert(…)` and discards the result. The
failure is therefore silent: the optimistic UI flips (Going turns purple, the
confetti fires), revalidation returns the unchanged row, and it reverts. Only
`saveInterests()` checks (`if (error) throw`), which is why `/interests` shows the
user a raw Postgres FK message.

Downstream consequences: `/saved` is permanently empty, calendar `scope=mine` is
always 0, the "New" pill never clears, and — because interests can never be
saved — `getInterests()` always returns null, `fitFor()` always returns
`score: 0.5`, and **the entire per-user fit layer in `lib/ranking.ts` is inert**.
No "For you · Startups" pill ever appears.

### Restoring real auth

From `SECURITY.md`, and accurate:

1. `git revert` the commits touching `middleware.ts`, `lib/auth/server.ts` and
   `lib/auth/roles.ts` — the original bodies are intact in history, which
   restores the per-request `getUser()` gate, real roles, and the
   forced-password-change and onboarding redirects.
2. Replace the open `demo_all` policies on the Guild tables with the
   ownership-scoped ones in `supabase/guild/0002_rls.sql` — **after** fixing that
   file, since it currently references two tables that do not exist.
3. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, and
   **delete the `DEMO_URL` / `DEMO_PUBLISHABLE_KEY` fallbacks in
   `lib/supabase.ts`** so a missing key fails loudly instead of silently reaching
   the demo project.
4. Rotate the publishable key on the demo project, since it is committed here.
5. Point `DEMO_USER_ID` at a real `auth.users` row (or restore real sessions) so
   the four per-user tables stop FK-failing.

### One stale, self-contradicting bullet in `SECURITY.md`

Its table correctly says every admin surface is enforced. Its "Not protected"
section then says *"The admin surfaces listed in the table above are reachable
until `requireAdmin()` is fixed."* **That sentence is false** — `/admin`,
`/admin/add`, `/admin/discovery` and `/design` all serve the home page on the
live deploy. It will make a reviewer distrust the rest of a file that is
otherwise unusually honest. Delete it.

---

## 8. Design system

### Tokens — `app/globals.css`

Tailwind v4, no config file. Tokens are declared as raw CSS vars on `:root`, then
re-exported through `@theme inline` so Tailwind generates the utilities.

**Light only, deliberately** — the header says a half-done dark mode reads worse
than none. `@custom-variant dark (&:is(.dark *))` is kept so legacy `dark:`
classes compile, but nothing ever adds `.dark`, so **every `dark:` class in the
repo is dead** (`app/(app)/loading.tsx` is full of them).

| Group | Tokens |
| --- | --- |
| Surfaces | `--canvas #f5f6fa` · `--surface #ffffff` · `--surface-2 #eef0f5` · `--line #e2e4ec` · `--line-strong #cdd0dc` |
| Ink | `--ink #12131a` · `--ink-2 #6b7080` · `--ink-3 #9a9fb2` |
| Accent | `--accent #5b5bd6` · `--accent-hover #4a4ac4` · `--accent-soft #eeeefb` · `--accent-ink #3b3ba6` |
| Status | danger `#d8385e`/`#fde8ee`/`#9b1f3f` · success `#1f8a5b`/`#ddf5e8`/`#146c43` · warning `#fff1c2`/`#7a5a00` (no solid warning) |
| Pastels (fill + ink) | sky `#dcebff`/`#1d4f91` · mint `#d9f3e6`/`#146c43` · lemon `#fff1c2`/`#7a5a00` · rose `#ffdde8`/`#9b2c52` · lilac `#e8e1ff`/`#4b3a9e` · peach `#ffe4d1`/`#8a4a16` |
| Shape | `--radius-ctl 12px` · `--radius-card 16px` · `--radius-panel 20px` · pills `rounded-full` |
| Shadow | `--shadow-card: 0 1px 2px rgba(18,19,26,0.04)` · `--shadow-float: 0 8px 24px …` |

Type: **Inter** 400/500/600 and **JetBrains Mono** 400/500 via `next/font/google`
(no component uses `font-mono`). Sizes are **hard-coded per component in px with
decimals** — 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16.5, 17, 19, 30,
32, 36 — not a Tailwind scale. Tracking: display `-0.02em`, title `-0.01em`,
uppercase labels `0.06em`/`0.08em`.

### The nine rules the system encodes

1. **One accent.** Indigo `#5b5bd6` marks "going" and the single primary action
   per view. At most one `accent` button per screen.
2. **Pastels carry meaning, never decoration** — a category or a relevance band.
3. **Text on a pastel is always the dark stop of the same hue.**
4. **Borders do elevation; shadows are near-zero.** Only floating layers
   (`Sheet`) get `--shadow-float`.
5. **Light only.**
6. **Never pure white as a page ground.**
7. **44px minimum touch target**; inputs are 48px on phone, 44px from `sm`.
8. **Radius by role**: control 12 / card 16 / panel 20 / pill full.
9. **Spacing in multiples of 4**; page gutter 16 on phone, 24 from `sm`.

Stale shadcn aliases (`--color-background`, `--color-foreground`, …) are still
declared; the only consumer left is `components/ui/tooltip.tsx`, which is itself
orphaned and never got migrated to the token system.

### Primitives — `components/ui/`

| File | Exports | Status |
| --- | --- | --- |
| `button.tsx` | `Button`, `buttonVariants`. 6 variants (`accent`, `primary`, `secondary` default, `ghost`, `danger`, `danger-solid`), 5 sizes (`sm` h-9, `md` h-11, `lg` h-12, `icon-sm`, `icon`), `pill` boolean | Wired, 25+ sites; `buttonVariants` used on `<Link>` in 13 pages |
| `pill.tsx` | `Pill`, `pillVariants`, `PillTone`, `CATEGORY_TONES`, `toneFor` | Wired (15 sites). **`toneFor` is orphaned** |
| `card.tsx` | `Card` (`padded`, `interactive`), `CardTitle`, `CardMeta`, `SectionHeading` | Wired, 18 sites |
| `chip.tsx` | `ChipRow`, `chipClass`, `Chip` | `ChipRow`/`chipClass` wired; **`Chip` only on `/design`** |
| `field.tsx` | `Label`, `inputClass`, `Input`, `IconInput`, `Field`, `FormNote` | Wired |
| `segmented.tsx` | `Segmented<T>`, `SegmentOption<T>` | Wired. One component, two flavours — `href` renders a `<Link role="tab">`, otherwise a `<button role="tab">` |
| `sheet.tsx` | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` | Wired — bottom sheet on phone, centred dialog from `sm`. Only real consumer is `components/calendar/event-block.tsx` |
| `bits.tsx` | `toneClass`, `Avatar`, `StatTile`, `DataRow`, `EmptyState`, `Skeleton`, `Divider` | `EmptyState` is the most-used bit (13 files). **`Skeleton` and `Divider` only on `/design`** |
| `tooltip.tsx` | `Tooltip*` | **Orphaned — zero imports anywhere** |
| `nav-tabs.tsx` | `NavTabs` | **Orphaned — zero imports.** Its docstring's use cases both shipped as `Segmented` |

### The shell

`app/layout.tsx` is the **only** layout — there is no `app/(app)/layout.tsx`. It
renders `Sidebar + TopBar + {children} + TabBar` when `user` is truthy, which is
always, so the signed-out branch is dead code and `/login` renders inside the app
shell.

`components/shell/nav.ts` is the single nav definition. `NAV_PRIMARY` order —
the two supply-side surfaces first, the event corpus as supporting material:

| # | href | label | icon | tab? |
| --- | --- | --- | --- | --- |
| 1 | `/teams` | Team Board | `Handshake` | yes (`exact`) |
| 2 | `/people` | People | `UsersThree` | yes |
| 3 | `/hackathons` | Hackathons | `Trophy` | yes |
| 4 | `/events` | All events | `ListBullets` | |
| 5 | `/feed` | Feed | `House` | |
| 6 | `/calendar` | Calendar | `CalendarBlank` | |
| 7 | `/saved` | Saved | `BookmarkSimple` | |

Plus `NAV_SETUP` (`/sources`, `/interests`, `/settings`), `NAV_ADMIN`
(`/admin/add`, `/admin/discovery`, `/admin` — never rendered, since `isAdmin()`
is false) and `NAV_YOU` (`/settings`, "You"). The file's own docstring says the
four tabs are "Feed, Calendar, Saved, You" — **stale**; they are Team Board,
People, Hackathons, You. `/design`, `/welcome`, `/p/[handle]` and `/squad/[id]`
appear in no nav list, so **the demo user has no link to their own profile
anywhere**.

`components/shell/sidebar.tsx` is desktop-only (`lg:flex`, 248px). Icons switch
to Phosphor `weight="fill"` when active. `components/shell/mobile.tsx` supplies
the sticky `TopBar` and the fixed `TabBar` (60px items, `env(safe-area-inset-bottom)`).
`components/shell/page-header.tsx` exports `PageHeader` and `Page` — and `Page`
renders a `<div>` where a `<main>` belongs, which is why four of the five Guild
routes set `role="main"` on it themselves.

### Branding

`lib/brand.ts`: `BRAND = { name: 'Guild', tagline: 'Find people. Form teams. Build something.', scope: 'SRM' }`,
plus a 7-value `COLOUR` mirror (its comment says "nine numbers").

`components/brand-mark.tsx` exports three things and only one is live:

- **`Wordmark({ tagline, onDark, size })` — wired.** Sizes map to pixel heights
  44 / 64 / 112 / 150. It renders **`<img src="/guild-logo.png">`**, a 487 × 640
  raster PNG stacked lockup. The source art is white-on-black, so on the light
  canvas it is `[filter:invert(1)] mix-blend-multiply` (invert makes it
  black-on-white, multiply drops the white ground); on dark it is
  `mix-blend-screen` with no invert. That treatment is load-bearing.
- **`Glyph`** and **`BrandMark`** — orphaned; `BrandMark` still carries
  `aria-label="Olvable"` and appears only on `/design`.

`lib/brand-paths.ts` is machine-generated by `brand/trace.py` from
`brand/source/olvable-logo.png` and holds the **Olvable** wordmark path plus the
"va" glyph. `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and the four
`public/icon-*.png` files are all still the Olvable "va" mark.

**`app/opengraph-image.tsx` is the worst stale asset.** It renders the traced
Olvable wordmark and hard-codes the tagline *"Touch grass, professionally."* —
which is neither the current `BRAND.tagline` nor the one it replaced — while its
`alt` export *does* read `BRAND.tagline`. Every shared Guild link previews as
that image.

Two different "stable tone from a string" algorithms coexist and disagree for the
same input: `toneFor()` (31-hash, orphaned) and `Avatar`'s `name.length % 6`
(live).

### Accessibility — what is actually present

Real, verified in the code: `role="main"` on four of five Guild routes; a
`role="status" aria-live="polite"` sr-only region in the sandbox, gated so it
stays silent during a draft and skips the first settled render; `role="meter"`
with full `aria-value*` on the team score, every coverage bar, the `/people` card
scores and all four bars on `/p/[handle]`; colour never carrying meaning alone
(readiness dot + label + number, the literal words "Open slot", `sr-only "High: "`
on risk severity, `sr-only "Verified: "` on proved skills); descriptive link
names throughout (`"Open {squad}"`, `"See the proof for {skill} (opens in a new
tab)"`, `"Add {name} to the roster. +X.X% team score. Fills …"`); a sound heading
outline with an `sr-only` h2 "Roles" specifically so the slot h3s do not dangle;
and a real `prefers-reduced-motion` branch that collapses the staged draft.

Real gaps: **no focus management** — clicking a candidate or an `X` destroys the
button that had focus and it falls to `<body>`, on every single interaction; the
candidate list is duplicated in the DOM so every candidate is announced twice;
`/teams/new` has no main landmark; and `/people` puts a `role="meter"` inside an
`<a>` whose `aria-label` overrides the subtree, so the Guild Score is not
announced when tabbing.

---

## 9. Testing

`vitest.config.ts`: `include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts']`,
`environment: 'node'`, alias `@` → repo root. **No jsdom, no testing-library, no
React test deps** — component tests are structurally impossible without adding a
dependency, which `AGENTS.md` forbids without an explicit decision.

**Verified: 21 files, 241 tests, all passing, 1.97 s.**

| File | Tests | Covers |
| --- | ---: | --- |
| `lib/engine/__tests__/engine.test.ts` | **41** | The whole thesis — see below |
| `lib/pipeline/geo.test.ts` | 34 | `classifyGeo` both regimes, city tables, the "Freshworks" no-signal keep, structured country codes, "Online" in a title ≠ online |
| `lib/dates/parse.test.ts` | 31 | Ordinals, dash normalisation, precision from format, **the DD/MM trap**, forward-only year inference, naive JSON-LD as IST, Devpost ranges borrowing across Dec→Jan, iCal exclusive all-day `DTEND` |
| `lib/team/mappers.test.ts` | 23 | Proof-link semantics (empty string is not a link), the damp reaching engine coverage, PostgREST string→number with NaN fallback, `level()` clamping, untrusted jsonb windows, zero-weight clamping |
| `lib/sources.test.ts` | 13 | Deadline vs dated kinds, `selectSourceIds` with mutes, `feedSourceIds` opt-in pool |
| `lib/calendar.test.ts` | 13 | State parsing, `rangeFor` (Monday weeks, months padded to whole weeks), placement, `isTimed` midnight-is-all-day |
| `lib/text.test.ts` | 11 | `snippet` boundaries, `displayTitle` dropping mode/date segments but never the first |
| `lib/hash.test.ts` | 9 | Volatile-field exclusion incl. nested, key-order independence, `scoringHash` ignoring venue/URL/tag order |
| `lib/demo.test.ts` | 9 | Degrades to null on error, no row, rejection, un-constructible client |
| `lib/ranking.test.ts` | 7 | `isPremiumVenue`, the prestige floor into Top picks |
| `lib/ics.test.ts` | 6 | TZID + 2h default end, all-day exclusive `DTEND`, folding, filename slug, venue/city dedupe |
| `lib/connectors/knowafest.test.ts` | 6 | Row extraction, day-first dates, multi-type tags |
| `scripts/guard.test.ts` | 5 | Refuses bare local, refuses `"false"`, always allows GitHub Actions |
| `lib/pipeline/manual.test.ts` | 5 | `buildManualRow` shape, IST→UTC, day precision, TBA, loud rejection |
| `lib/filters.test.ts` | 5 | `toggleHref`, `pageHref`, `parsePage`, sort parsing |
| `lib/connectors/bevy.test.ts` | 5 | Venue outranks `is_virtual_event`, offset-carrying instants, garbage tolerance |
| `lib/events.test.ts` | 4 | Deadline listings use the cutoff, not the window opening |
| `lib/discovery.test.ts` | 4 | `toLeads` shaping, dropping covered domains, keeping LinkedIn hits |
| `lib/connectors/eventbrite.test.ts` | 4 | JSON-LD → day precision, city-is-not-a-venue, online |
| `lib/pipeline/quality.test.ts` | 3 | Had-rows-now-none is an error; sparse sources are not |
| `lib/dates/format.test.ts` | 3 | Real time for timed, never a time at day precision |

### What the engine's 41 tests pin

Eleven groups, and they pin the product's **claims**, not its implementation —
if one fails, the thesis changed:

- **Coverage / diminishing returns (4)** — 0.8 + 0.5 → 0.90 not 1.3; a duplicate
  0.8 moves 0.80 → 0.96; an unverified 0.8 is 0.48; a claim damped below the
  floor contributes *nothing*, not partially.
- **Marginal gain — gaps beat duplicates (4)** — a figma-filler out-ranks an
  equally-skilled React duplicate on a React-owning team; `fills` vs
  `duplicates` labelled against the current roster; **an extra body who fills
  nothing is a strictly negative delta**; a seated member is never re-offered.
- **Score components (3)** — solo exemptions; strict availability intersection
  (Tue+Thu ∩ Thu+Sat = 180 min); commitment 5 vs 1 → 0.
- **The headline equation (5)** — `WEIGHTS` asserted literally so the README's
  numbers cannot drift; a hand-computable two-person case pinned to 10 decimals
  (base 0.8 / overlap 0.6 / balance 0.75 / commitment 0.75 / score 0.7575);
  weight-weighted not count-averaged; zero requirements → finite; **empty roster
  → score 0.4, not NaN**, with a comment that `/squad/[id]` renders that path.
- **Availability (3)** — an unparseable time drops one window, not the week.
- **Auto-draft (4)** — one person per gap before any duplicate;
  **byte-identical across two runs**; monotone `scoreAfter`; `maxSize` counts
  pre-seated members.
- **Risks (5)** — bus factor, dead zone, unmet severity escalating by weight,
  commitment gap firing at spread 3 and not at 2, and a well-matched 4-person
  team returning **exactly `[]`** — no risk theatre.
- **`explainScore` (4)** — names contributors, reads open gaps by role label,
  appends "still thin", and emits the two coordination lines only above one
  member.
- **Social layer (9)** — clones score 0 and disjoint stacks 1; a sub-floor claim
  contributes nothing; `peopleYouShouldMeet` excludes me and ranks the clone
  last; `gapFeed` excludes projects I am on; the 0.40/0.25/0.35 total
  re-derived by hand; versatility caps at 8; a skill-less profile scores 0, not
  NaN.

### Zero coverage

- **Every React component.** `components/ui/*`, `components/shell/*`,
  `components/team/*`, `components/calendar/*`, `components/admin/*`,
  `components/brand-mark.tsx`. The vitest `include` pattern cannot even reach
  `components/`.
- **Every route** — no page, layout, server action or route handler is tested.
- `lib/utils.ts`, `lib/theme.ts`, `lib/brand.ts`, `lib/brand-paths.ts`.
- **`lib/auth/roles.ts`.** The one invariant `CLAUDE.md` calls load-bearing —
  "do not make `isAdmin()` return `true`" — is completely unpinned. So is
  `middleware.ts`.
- **Token consistency.** Nothing asserts that `lib/brand.ts` `COLOUR`,
  `brand/colours.json` and `app/globals.css` agree, despite three comments
  saying they are kept in sync by hand.
- **Five of the ten connectors** — `allevents`, `luma`, `devfolio`, `devpost`
  and `unstop`, i.e. the five carrying the corpus, have no unit tests. Live
  checking is `npm run connector:test -- <source>`.
- `requirementCoverage`'s contributor **ordering** contract is stated in the type
  comment and never asserted, even though `alreadyCoveredBy` and
  `explainScore`'s name list both depend on it.

---

## 10. Infrastructure

### Supabase

| | Project | Role |
| --- | --- | --- |
| Demo | `fjxgqiveolnnrslihodl` | What everything in this build points at. Hand-built, 25 events, 40 profiles. `.env.local` and the committed fallback name the same project, so local and deployed behave identically |
| Production Olvable | `gxxhjmwgxmjhmhtnipua` (ap-south-1) | Shaan's real aggregator, ~1,300 real events and real users. **Never referenced by this build.** Named only in the untracked `.env.example` |

### Vercel

Project `guild`, `vercel.json` = `{ framework: 'nextjs', regions: ['bom1'] }`.
Live at `https://tryguild.vercel.app`, confirmed serving from `bom1`. Next
**16.2.11**, React **19.2.4**, Node 24 in CI.

`next.config.ts`: `poweredByHeader: false`;
`outputFileTracingIncludes: { '/opengraph-image': ['./brand/fonts/*.ttf'] }`
(without which the OG route 500s in prod); and five security headers on
`/:path*`, **all verified live**: `content-security-policy: frame-ancestors 'none'`,
`x-frame-options: DENY`, `x-content-type-options: nosniff`,
`referrer-policy: strict-origin-when-cross-origin`, and
`permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.
Vercel adds HSTS. There is deliberately **no `script-src` CSP** — a strict one
needs per-request nonces.

**No cron block.** Ingestion was moved off Vercel on purpose: Hobby caps
functions at 300 s, which AllEvents alone cannot fit at a 10 s crawl delay.

### GitHub Actions — `.github/workflows/`

| Workflow | Schedule | Does |
| --- | --- | --- |
| `ci.yml` | push to main + every PR | `npm ci`, lint, `format:check`, typecheck, test, build. **Deliberately carries no secrets** so a fork can prove itself — which also catches anything needing a key at build time |
| `ingest.yml` | daily 01:30 UTC (07:00 IST), 45 min | `npm run seed`, then one `npm run ingest -- $s` per source over 9 sources (so one broken connector cannot stop the rest), then `npm run score` |
| `healthcheck.yml` | 03:00 / 11:00 / 19:00 UTC | Supabase keep-alive plus a staleness check; opens a de-duped GitHub issue on failure |
| `discover.yml` | Mondays 02:30 UTC | Google CSE sweep into `discovery_leads` |

**None of these can be running against the demo database** — `scrape_runs` and
`raw_listings` are empty and `sources` holds 4 rows, not 9+.

### Environment variables

| Var | Used by | Fallback | Present here? |
| --- | --- | --- | --- |
| `SUPABASE_URL` | `createServiceClient`, `createAuthClient`, all scripts | `DEMO_URL` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | first choice in `createServiceClient`, `create-user`, `grant-admin`, all data workflows | falls through | **present in `.env.local`, contradicting `SECURITY.md` and that file's own header** |
| `SUPABASE_ANON_KEY` | `createAuthClient`, second choice | `'demo-no-auth'` | yes |
| `DEMO_USER_ID` | `lib/auth/server.ts` | `00000000-0000-4000-8000-000000000001` | **no — this is why every per-user write FK-fails** |
| `SITE_URL` | magic-link era | — | yes, vestigial |
| `GEMINI_API_KEY`, `GROQ_API_KEY` | `lib/llm/`, `ingest.yml` | — | **no** |
| `GOOGLE_CSE_KEY`, `GOOGLE_CSE_CX` | `scripts/discover.ts` | — | **no** |
| `ALLOW_PROD_WRITES` | `scripts/guard.ts` | — | no |

**No env var is `NEXT_PUBLIC_`.** That rule holds.

`lib/supabase.ts` commits a fallback URL and key in plaintext:

```ts
const DEMO_URL = 'https://fjxgqiveolnnrslihodl.supabase.co'
const DEMO_PUBLISHABLE_KEY = 'sb_publishable_IyaMeO1ngN7JBBPSHwU8aQ_xp6Q4LtX'
```

`createServiceClient()` resolves
`SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY ?? DEMO_PUBLISHABLE_KEY`. The
`if (!url || !key) throw` below it is **unreachable dead code** (both fallbacks
are non-empty literals), and the message it would print tells the reader to copy
`.env.example` — which **is not tracked**: `.gitignore` puts `!.env.example`
before the broader `.env*` rule, so the negation loses. `git ls-files | grep -i
env` returns exactly one file, `scripts/load-env.ts`. A missing key therefore
reaches the demo project **silently** instead of failing loudly.

### The seed script — `seed/seed-demo.mjs`

Plain ESM, run as `SUPABASE_URL=… SUPABASE_ANON_KEY=… node seed/seed-demo.mjs`.
Not in `package.json` scripts. Writes over raw PostgREST with
`Prefer: resolution=merge-duplicates`, so every insert is an idempotent upsert on
a natural key.

In order: 4 sources → 25 events from `ingest/events.json`
(`source_uid = ${source}-${i}-${sha256(url||title).slice(0,32)}`,
`relevance_score = 60 + (parseInt(sha256(title).slice(0,2), 16) % 38)` so the
demo shows a spread of bands rather than a wall of identical numbers) → 40
profiles → 75 skill rows (`proof_url = 'https://github.com/<handle>'` when the
tuple flag is 1, else null — this is what drives the 0.6 damp) → 5 projects
(upserted on `title`) → 17 requirements (**no `on_conflict` — re-running
duplicates them**) → 7 memberships.

**The demo data is shaped deliberately, and the shape is the demo:**

- **React is over-supplied on purpose** — 12 of 40 profiles list `react`.
  **`figma` and `pitching` are deliberately scarce.** That asymmetry is what
  makes probabilistic-OR visible: a 13th React person adds almost nothing, the
  one available designer adds a lot.
- **Four availability patterns** — A: Tue/Thu 18:00–21:00 (the flagship team and
  the best candidates); B: Mon/Wed evenings; C: weekend mornings (the deliberate
  dead zone); D: Tue–Fri 21:30–23:30. So the 0.15 overlap term has something to
  bite on.
- **"You" is `aarav`** — Aarav Menon, CSE year 3, experience 4, commitment 5,
  pattern A, ML 0.7 verified + backend 0.4 unverified. He owns CropGuard.
- **Five squads of deliberately different shapes** — CropGuard (2 members, 5
  weighted requirements, the flagship), Fraud-lens (1 member, 0% covered, the
  "needs people" case), Campus mental-health (research, no event), Hostel energy
  monitor (hardware), Non-tech founder (startup).
- **The events are real** — 25 genuine upcoming hackathons from the public
  Devfolio/Devpost/Unstop APIs, so `projects.event_id` points at something a
  judge can go and verify.

`seed/generate.mjs` is an **orphaned and broken** earlier generator: it writes to
`src/repo/static-seed.json`, and `src/` does not exist in this repo, so it throws
ENOENT. `lib/static-seed.json` (43 KB) is referenced by nothing.

---

## 11. Orphaned, stubbed or broken

One consolidated, honest list.

### Broken and user-visible

| # | Thing | Detail |
| --- | --- | --- |
| 1 | **`/sources` shows "0 live"** | `source_health()` RPC does not exist on the demo DB; the error is swallowed and the page renders its empty state while four enabled sources sit in the table |
| 2 | **`/feed` shows "New 0", no chips, no health strip** | `unseen_active_count()` also missing; the feed derives chips from the dead RPC, unlike `/events` and `/hackathons` |
| 3 | **`/events` returns 0 results** | `visibleSourceIds()` defaults to `kind='events'`, stripping all three deadline sources; only `manual` remains and it is empty. The feed's "Browse all 14" tile links straight here |
| 4 | **`/calendar` is empty in both scopes** | `mine` FK-fails; `all` hits the same `kind='events'` default plus a `relevance_score >= 60` floor |
| 5 | **`/welcome` is a 404** | The directory holds `actions.ts` and no `page.tsx` |
| 6 | **Every per-user write FK-fails silently** | Going/Save/Not-for-me flip and revert; `/saved` is permanently empty; the "New" pill never clears; `/interests` shows a raw Postgres error |
| 7 | **`notFound()` returns HTTP 200** | `/squad/{bad-uuid}` and `/p/nobody` render Next's 404 body with a 200 status, because `await connection()` starts streaming before `notFound()` throws |
| 8 | **The "N on the roster" pill never updates** | Server-rendered outside the client sandbox |
| 9 | **A roster member covering nothing cannot be removed** | No roster list; removal only via a covered slot's contributor chip |
| 10 | **The board's "Squads looking for you" duplicates cards** | Anything in the rail is re-rendered in "All squads", with a different pastel |
| 11 | **Same squad, two different numbers** | The board shows `base`, the sandbox shows `score`; nothing explains the gap |
| 12 | **The OG image is wrong** | Olvable wordmark plus a tagline matching neither `BRAND.tagline` nor its own `alt` export |
| 13 | **The feed's copy contradicts the corpus** | "N events across Tamil Nadu" over hackathons in Bhopal, Jaipur, Kalyani and Kochi |
| 14 | **`app/(app)/loading.tsx` is the wrong skeleton** | One route-group loading file, shaped like the old Olvable feed, flashing on `/teams`, `/people` and `/squad/[id]` |
| 15 | **Sign out and Change password always fail** | Both run against a client with no real credentials; sign-out dumps the user on a `/login` they cannot use or escape |

### Stubbed (present, not doing its job)

`middleware.ts` (pass-through) · `lib/auth/server.ts` (`getSessionUser` returns a
constant) · `/teams/new` (honest placeholder, no form) · `card-actions.tsx`
(fully built, writes go nowhere) · `/login` and `/auth/signout` (vestigial but
publicly reachable and functional-looking) · `lib/supabase.ts`'s unreachable
`throw`.

### Orphaned code

**Engine exports with no app caller:** `explainScore` (the worst case — tested,
documented, zero callers, and it is exactly the "explain the score" affordance
the sandbox lacks), plus `marginalGain`, `complementarity`,
`effectiveProficiency`, `requirementCoverage`, `sharedMinutesPerWeek` (all
internal-only), the type `DraftPick`, and the constants `WEIGHTS`,
`OVERLAP_TARGET_MINUTES`, `DEAD_ZONE_MINUTES`, `PROFICIENCY_FLOOR`.

**Olvable exports with no caller:** `markSeen` (`app/(app)/actions.ts:52` — its
docstring says it is "only ever fired by an explicit client action"; there is no
such action) · `completeOnboarding` · `getSeedEvents` (`lib/interests.ts`) ·
`isOnboarded` · `filters.freeOnly` (parsed, serialised, applied in SQL, **no UI
control anywhere**) · `exclusiveEndToInclusive` (Luma reimplements it locally) ·
`mightBeInScope` (pipeline-side) · `OCGROUPS_FORMATS`, `TIE_FORMATS`,
`DAY_FIRST_FORMATS`.

**UI orphans:** `components/ui/nav-tabs.tsx` and `components/ui/tooltip.tsx`
(whole files, zero imports) · `toneFor()` · `dateTint()` · `Glyph` and
`BrandMark` · `Chip`, `Skeleton`, `Divider` (only on the unreachable `/design`) ·
the signed-out branch of `app/layout.tsx` · the entire admin nav group.

**Files:** `seed/generate.mjs` (throws ENOENT) · `lib/static-seed.json`
(referenced by nothing) · `supabase/guild/0001_schema.sql` and `0002_rls.sql`
(applied by nothing, and `0002` cannot run).

**Tables:** `event_duplicate_links` · `event_actions` · `mute_rules` ·
`raw_listings` · `invited_emails` (dropped by a migration, still on the live DB).
**Columns never written by the pipeline:** `raw_listing_id`, `audience`,
`goal_fit`, `missing_run_count`, `normalize_error`, `scrape_runs.llm_calls`.
**Columns written by the seed and read by nothing:** `profiles.looking_for`,
`projects.kind`, `projects.effort`.

**Config:** the `eventbrite` connector (complete and tested, `enabled: false`,
omitted from the workflow loop).

### Duplication that will drift

1. **Three copies of the DB→engine mapper** (§4b) — only one is tested, and the
   two untested ones lack the zero-weight clamp.
2. **The `coverage < UNMET_THRESHOLD` rule written out three times** —
   `squad-card.tsx:76`, `sandbox.tsx:87`, `sandbox.tsx:245`. It is the product's
   core claim about which roles are open.
3. **Membership status read two ways** — `/teams` deny-lists six statuses
   (including neither of the two the CHECK constraint actually permits, so
   `'invited'` counts there); `/squad/[id]` and `/p/[handle]` allow-list
   `'accepted'`.

### Docs contradicting code (trust the code)

| Claim | Where | Reality |
| --- | --- | --- |
| "its 17 tests (`npx vitest run lib/engine`)" | `CLAUDE.md`, `AGENTS.md`, `docs/ARCHITECTURE.md:131` | **41** |
| "`npm run format:check` … passes before commit" | `AGENTS.md` | **27 files fail**, including all 11 in `lib/engine/` (double quotes, semicolons) |
| "The admin surfaces … are reachable until `requireAdmin()` is fixed" | `SECURITY.md` | False — all four are closed, verified live |
| "`.env.example` is not in the repo" | `AGENTS.md` | It exists **on disk** but is **not tracked**; the practical claim holds for a cloner |
| "A weekly CI job runs `connector-test` for every source" | `scripts/connector-test.ts` header | No such workflow exists |
| "Honest identification … used everywhere, without exception" | `config/sources.ts` | `ingest/fetch-events.mjs` sends a fake Chrome UA |
| Five connectors | `README.md`, `docs/ARCHITECTURE.md` | Ten are built |
| The pipeline runs "daily 07:00 IST" | `docs/ARCHITECTURE.md` | Accurate as design; the demo DB has 0 `scrape_runs` |
| "the four `tab` items are Feed, Calendar, Saved, You" | `components/shell/nav.ts` docstring | Team Board, People, Hackathons, You |
| `getDemoProfile` is "what the profile screen shows" | `lib/demo.ts` docstring | It is not; `/p/[handle]` reads the URL. One caller: `/teams` |
| "the sandbox can reuse it" | `components/team/squad-card.tsx:20` | The sandbox does not import it |
| "nine numbers" | `lib/brand.ts` | Seven |
| "The service-role key is deliberately absent" | `.env.local` header, `SECURITY.md` | A `SUPABASE_SERVICE_ROLE_KEY` is present in `.env.local` |
| Nudges as roadmap items 1 **and** 4 | `docs/ROADMAP.md` | Duplicated entry |

Three roadmap items listed as pending have in fact shipped: the auto-draft
`aria-live` region, the `h1 → h3` fix on `/people`, and the score bars (shipped
as `role="meter"` rather than `role="progressbar"`).

---

## 12. Where to take it next

Ordered by what a reader of this repo would judge, then by what the product
cannot do, then by hygiene. The reasoning matters more than the order.

### 1. Run the three missing SQL functions against the demo database

`unseen_active_count` (`0006`) and `source_health` (`0007`, replaced by `0011`).
**Why first:** it is the only item here that is a copy-paste with a service role
and it fixes a page that currently tells a reviewer a flat lie ("No live
sources — Nothing is enabled") plus three silent gaps on the front-facing feed.
Highest ratio of credibility recovered to effort spent in the whole list.

### 2. Point `DEMO_USER_ID` at a real `auth.users` row

**Why second:** one environment variable revives four tables and roughly a
quarter of the app — Going/Save, `/saved`, calendar `scope=mine`, the "New"
badge, interests, source mutes, and with interests the entire per-user fit layer
in `lib/ranking.ts` that is currently computing `0.5` for everyone. Nothing else
in this list unlocks as much surface for as little work. (`saveInterests()` also
calls `auth.admin.updateUserById`, so full onboarding additionally needs the
service role.)

### 3. Nudges — the one real capability gap

Roadmap items 1 and 4 (duplicated). **Why here and not first:** it is the
largest genuine product gap — Guild identifies exactly the right teammate and
then cannot let you contact them; the whole funnel ends at "here is who you are
missing" with no next action. It ranks below the two above only because it is a
week of work rather than an hour, and because it needs a `nudges` table that does
not exist, a send action, an inbox, and accept/decline. `docs/target-product.md`
§2 has the right design: a nudge rather than a chat, with contact detail revealed
only on accept.

### 4. Build `/teams/new` for real

**Why fourth:** the demand side of the problem statement has no entry point. Every
squad in the demo came from a seed script. Building it means picking an event
from the corpus (or none), writing the prose ask, then adding weighted
requirements with a skill, a floor and a weight — and **those requirements are
what the engine scores**, so this is the one form that must not be sloppy. It is
also the natural place to introduce the first Guild write path, which nudges will
then reuse.

### 5. Collapse the three mappers into `lib/team/mappers.ts`

**Why here:** it is the highest-risk duplication in the codebase. Two of the four
Guild pages build requirements without the `Math.max(0.0001, …)` weight clamp
that the tested mapper exists to provide, and pass unvalidated jsonb straight to
the engine. The tested version already exists and already has 23 tests — this is
deletion, not construction. Do it before adding write paths, so new code inherits
one seam.

### 6. Wire up or delete `explainScore`

Roadmap item 3. **Why:** exported-and-unused is the worst of the three options,
and this particular function is precisely the "explain the score" affordance the
sandbox lacks. It would also fix the cross-screen confusion where the board shows
`base` and the sandbox shows `score` with nothing accounting for the difference.
While in there, extract `openRequirements(reqs, coverage)` into `lib/engine/` and
point all three copies of the `< UNMET_THRESHOLD` rule at it (roadmap item 6).

### 7. Fold `supabase/guild/*.sql` into `supabase/migrations/`

Roadmap item 5. **Why:** the files currently describe a database that does not
exist and, worse, describe RLS policies that are the *opposite* of what is
deployed. A security reviewer reading them alone would reach the wrong
conclusion. The fold has to fix four things: drop the colliding second `events`
table, add `profiles.looking_for` / `projects.kind` / `projects.effort`, add the
unique constraint on `projects.title` that the seed depends on, and either build
`communities`/`community_members` or delete them so `0002_rls.sql` can run.

### 8. Sandbox interaction repairs

**Why grouped:** four small fixes in one file that together change how the demo
feels. Move the "N on the roster" pill inside the client component; add a roster
list so a member who covers nothing can be removed; add a Stop control (today
Reset is the only abort and it discards the roster); and restore focus after add
and remove, which currently drops to `<body>` on every single interaction.

### 9. Fix the honesty gaps in the seeded corpus

**Why:** `ingest/fetch-events.mjs` sends a fake Chrome user agent in direct
contradiction of a policy the repo states twice and once enforced by removing
exactly such a path — that is a decision to make out loud, not a silent
divergence. And it performs no geo classification, so the feed's "across Tamil
Nadu" copy sits above hackathons in West Bengal. Either run the events through
`classifyGeo` or change the copy; leaving both is the version a judge notices.

### 10. Formatting, brand and doc hygiene

**Why last — but do it before any submission:** `npm run format` fixes 27 files
including the entire engine, and CI checks it. Then correct the "17 tests" claim
in `CLAUDE.md`/`AGENTS.md` (it is 41), delete the false "admin surfaces are
reachable" bullet from `SECURITY.md`, fix the `.gitignore` ordering so
`.env.example` is actually tracked, and replace `app/opengraph-image.tsx` — it is
what every shared Guild link previews as, and it currently shows the Olvable
wordmark under a tagline that exists nowhere else in the codebase.

### Explicitly not next

Performance (roadmap item 7) — `guildScore` is O(people × skills × people) and
the sandbox re-runs unmemoized every 420 ms during a draft, but at 40 people and
200-row pool caps nothing is measurably slow. Measure before optimising, as that
item itself says. Component tests — they would need jsdom and testing-library,
and `AGENTS.md` forbids new dependencies without an explicit decision; the
correct cheaper move is extracting more pure helpers into `lib/`, where
`vitest.config.ts` already collects them.
