# Guild

Guild is a team-formation platform: you describe what a project **needs**, and
it ranks whole candidate **teams** against those needs rather than ranking
people against each other. It is built for **Problem Statement 2 —
ProjectMatch (Team Formation Platform)**.

Live demo: <https://tryguild.vercel.app> — no login, no signup, no account to
create. The security consequences of that are documented in
[SECURITY.md](SECURITY.md) rather than glossed over.

## The problem

The problem statement:

> When people need to form teams for projects, competitions, hackathons,
> research, or startups, they often rely on existing social connections. This
> makes it difficult to discover people with complementary skills. A developer
> may need a designer and domain expert, while a researcher may need someone
> with data engineering experience, but neither knows who is available or
> interested.

The operative word is **complementary**. The hard part is not search — a filter
on `skill = react` is trivial. The hard part is that **the best individuals do
not make the best team.** A person with a skill the team already has adds
almost nothing; the person who fills the gap changes the outcome. A tool that
ranks people by raw skill hands a hackathon team five React developers and no
designer, which is exactly the failure the statement describes.

So Guild scores the team, and ranks a person by **what they would add to it**.

## The approach

Coverage of a requirement is a probabilistic OR over the members who clear that
requirement's proficiency floor:

```
p_eff(member, r)  = proficiency × (has a proof link ? 1.0 : 0.6)
coverage(r)       = 1 − Π(1 − p_eff)         over members clearing r's floor

base              = Σ(weight_r × coverage_r) / Σ(weight_r)
score             = 0.60·base
                  + 0.15·availability_overlap
                  + 0.15·experience_balance
                  + 0.10·commitment_match

marginalGain(c)   = score(team ∪ {c}) − score(team)
```

The product `Π(1 − p_eff)` is the whole idea. Two people at 0.8 and 0.5 on the
same requirement give `1 − 0.2 × 0.5 = 0.90`, not `1.3`: **the second person
moves coverage 0.80 → 0.90, while a missing requirement moves from 0.** So
diminishing returns is not a rule bolted on afterwards — it falls out of the
arithmetic, which is why the ranking cannot be gamed by piling on more of the
same person.

`marginalGain` is then the single number behind every ranking and every
explanation in the UI: candidate order, the gap feed, auto-draft, and the chips
that read "fills Designer" or "already covered by Rohan".

Skill tags are the least reliable thing on any profile, so a claim backed by a
repo or a past project counts in full and an unbacked one counts at `0.6×`.
Credibility is modelled, not assumed.

### How the statement maps to the model

Every noun in the problem statement is a term in the score, not a filter beside
it:

| The statement asks for   | Where it lives                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| Skills                   | `p_eff` per claim — proficiency, damped to `0.6×` without a proof link |
| Project requirements     | Weighted slots, each with a minimum-proficiency floor                 |
| Availability             | `overlap` — weekly minutes **all** members share, 10 h/week scores 1.0 |
| Experience               | `balance` — `1 − variance` of experience levels across the team       |
| Commitment               | `commitment` — the spread between the keenest and the least keen      |
| Interests                | The ingested events corpus a squad forms around, and `scarcity` in each person's Guild Score |
| "who is available or interested" | The gap feed — open squads ranked by *your* marginal gain     |

## See it in 60 seconds

Numbers below are computed by the engine from the seeded demo data, not
illustrative.

1. Open <https://tryguild.vercel.app>. You are straight in — no account.
2. **Team Board** → open **CropGuard — on-device crop disease detection**.
3. It sits at **55%**. Two members (ML + backend) cover two of five
   requirements; **Frontend, Designer and Pitch are all at 0**.
4. The ranked candidates are led by **Meera Pillai (figma 0.85, verified) at
   +7.8%**, tied with the first React developer — because at this moment
   *both* fill an empty slot.
5. Add the React developer. Now watch the list re-rank: the **next** React
   developer — Vikram Nair, `react 0.80`, verified, on paper an excellent
   candidate — is worth **+1.6%**, while Meera is now worth **+10.1%**. That is
   the thesis on screen: strength does not rank, *complementarity* does.
6. Press **Auto-draft**. It picks Meera (+7.8%), then Rohan (+10.1%), then
   Kabir (+4.8%), then Kavya (+2.2%), and stops at **79.6%** when no remaining
   person clears the 0.5% gain floor. Greedy over `marginalGain`, deterministic,
   so it replays identically every run.
7. Read the **Team X-ray** — bus factor, availability dead zones, commitment
   mismatch.
8. **People** → open any profile for a Guild Score split into credibility,
   versatility and scarcity, plus who complements you and which squads need you.

## Architecture

Four layers, in dependency order:

```
lib/engine/         the scoring model — pure TypeScript, ZERO imports
lib/team/           mappers: Postgres rows → the engine's plain objects
app/(app)/…         Server Components: fetch, map, score, render
components/team/    the interactive sandbox (the engine, re-run in the browser)
```

**`lib/engine/` imports nothing** — not React, not Supabase, not Node, not a
date library. Every file in it imports only its own siblings (`./types`,
`./coverage`). That is deliberate:

- The maths is testable in milliseconds with no database, no fixtures and no
  mocking — which is why the model has real test coverage while the rest of the
  app leans on manual checks.
- The **same code** runs on the server to rank the Team Board and in the browser
  to re-score the sandbox on every click, with no API round trip and no risk of
  the two drifting apart.
- The product's core idea has no framework dependency, so it outlives this
  Next.js app.

`lib/team/mappers.ts` is the only boundary between the database and that
purity, and it is defensive on purpose: a malformed availability window or a
zero weight from the database must not reach the engine and poison a score.

| Route          | What it does                                              |
| -------------- | --------------------------------------------------------- |
| `/teams`       | Team Board — squads ranked by what *you* would add         |
| `/squad/[id]`  | The sandbox: open slots, ranked candidates, auto-draft, risks |
| `/people`      | The pool, ranked by Guild Score                            |
| `/p/[handle]`  | Profile: score breakdown, complementarity, gap feed        |
| `/`, `/events`, `/hackathons` | The event corpus a squad forms around       |

The four Guild routes read Supabase through `createServiceClient()` inline
rather than through `lib/queries/`. `lib/queries/` is Olvable's data layer,
shaped around event lists (deadline filtering, muted sources, per-user
ranking); the Guild pages need whole-pool reads that do not fit it. Olvable's
own surfaces still go through `lib/queries/` and should keep doing so.

## Running it locally

```bash
npm install
npm test          # 241 tests, 21 files
npm run dev       # http://localhost:3000
```

The app carries a working Supabase URL and publishable key as fallbacks in
`lib/supabase.ts`, so `npm run dev` shows the live demo data with no `.env`
file at all.

To point it at your own Supabase project instead, put these two values in
`.env.local` and seed. The seeder is idempotent, so re-running it is safe:

```bash
# .env.local
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<publishable-key>
```

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... node seed/seed-demo.mjs
```

`seed/seed-demo.mjs` writes over PostgREST with whichever key it is given, and
prefers `SUPABASE_SERVICE_ROLE_KEY` if you set one.

Two caveats worth knowing before you try this:

- A checkout does **not** include `.env.example`. `.gitignore` lists
  `!.env.example` before the broader `.env*` rule, so the negation loses and
  the file is never committed. The two variables above are all of it this build
  reads.
- The schema for a fresh database is `supabase/migrations/*.sql` (Olvable's,
  applied in order) **plus** the five Guild tables — `profiles`, `skills`,
  `projects`, `requirements`, `memberships`. Do not apply
  `supabase/guild/0001_schema.sql` on top of the Olvable migrations: it
  declares its own `public.events` with a different shape and will collide.
  Take the Guild tables from it and leave its `events` alone; the app reads
  Olvable's `events` (`starts_at_local`, `is_online`, `city`). See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reconciled table list.

The seed is shaped so the maths is visible rather than asserted: React is
deliberately over-supplied across 12 of the 40 profiles, and `figma` and
`pitching` are deliberately scarce. That is what makes a candidate list
*demonstrate* diminishing returns instead of claiming it.

## Testing

`npm test` runs **241 tests across 21 files**. **41 of them cover
`lib/engine/`** — run `npx vitest run lib/engine` to see just those, in about
0.2s.

The engine tests pin the *thesis*, not the implementation. Each one is a claim
that would be false if the product stopped working the way it says it does:

- `coverage(0.8, 0.5)` is exactly `0.9` — the probabilistic OR, not a sum.
- Two identical 0.8 claims give `0.96`, so the duplicate is worth `0.16`.
- An unverified `0.8` claim contributes `0.48`, not `0.8`.
- A claim below a requirement's floor contributes **nothing**, not a little.
- The score is the `0.60/0.15/0.15/0.10` weighted sum of its four terms, to the
  last decimal — the headline equation, asserted directly.
- A gap-filler out-ranks an equally-skilled duplicate, and an extra body who
  fills nothing scores a **negative** gain.
- Auto-draft is deterministic across runs, improves monotonically, and stops on
  diminishing returns.
- Degenerate inputs return `0`, never `NaN`: no requirements, no roster, a
  malformed availability window, a profile with no skills.

Two more suites guard the boundary either side of that purity:
`lib/team/mappers.test.ts` (21 tests — every defensive branch: junk jsonb, a
zero weight clamped off zero, PostgREST numerics arriving as strings, and that
an empty `proof_url` means *unverified* rather than *verified*) and
`lib/demo.test.ts` (9 tests — `getDemoProfile()` degrades to `null` on any
failure rather than throwing, because a demo that 500s is worse than one that
shows less).

The rest is Olvable's pipeline: date parsing, geo classification, content
hashing, ICS generation, filters, connectors.

## Security posture

**This build has no authentication, deliberately**, because it is a demo that
must open for a judge without an account. That decision has consequences, and
[SECURITY.md](SECURITY.md) states them in full rather than leaving a reviewer
to infer them. In short:

- `middleware.ts` is a pass-through and `lib/auth/server.ts` returns one
  stand-in user, so the twenty-odd call sites that expect a session keep
  working.
- That stand-in user is a **member, not an admin**. `lib/auth/roles.ts`
  `isAdmin()` reads the real role instead of returning `true`. Removing a login
  wall and handing every anonymous visitor the corpus-editing and
  access-control screens are two different decisions, and only the first was
  intended.
- The app runs on the Supabase **publishable** key, which is public by design,
  against a **throwaway** demo database of generated seed data whose tables
  carry open policies. **No service-role key exists in this build.**
- Shaan's real Olvable production database is a different project and was never
  touched.
- Restoring real auth is a revert of three files — `middleware.ts`,
  `lib/auth/server.ts`, `lib/auth/roles.ts` — plus tightening the demo
  policies and setting `SUPABASE_SERVICE_ROLE_KEY`. The original bodies are
  intact in git history.

## Credit

Guild is built inside **Olvable** (<https://github.com/ShaanGS/chennai-events>),
my own event aggregator for Chennai. Its ingestion pipeline, design system,
shell and event corpus are reused here as the surface a team forms around — a
squad points at a real ingested hackathon, not a placeholder. The
team-formation engine, schema and screens are new.

Contributor docs: [CONTRIBUTING.md](CONTRIBUTING.md) ·
[AGENTS.md](AGENTS.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
