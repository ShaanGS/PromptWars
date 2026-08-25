# Guild

A team-formation platform for SRM, built for **Problem Statement 2 —
ProjectMatch**. Guild helps people form effective project teams from skills,
interests, availability, experience and project requirements, and it does that
by scoring **whole teams against what a project needs** rather than ranking
people against each other.

Live demo: <https://tryguild.vercel.app> — no login, no signup.

## The problem

> When people need to form teams for projects, competitions, hackathons,
> research, or startups, they often rely on existing social connections. This
> can make it difficult to discover people with complementary skills. A
> developer may need a designer and domain expert, while a researcher may need
> someone with data engineering experience, but neither knows who is available
> or interested.

The hard part is not search. It is that **the best individuals do not make the
best team.** A second person with a skill you already have adds almost nothing;
the person who fills your gap changes everything. A tool that ranks people by
raw skill will hand a hackathon team five React developers and no designer.

## The approach

Coverage of a requirement is a probabilistic OR over the people who can do it:

```
coverage(r) = 1 − Π(1 − p_eff)        for each member meeting r's floor
p_eff       = proficiency × (has a proof link ? 1.0 : 0.6)

base        = Σ(weight_r × coverage_r) / Σ(weight_r)
score       = 0.60·base + 0.15·overlap + 0.15·balance + 0.10·commitment

marginalGain(candidate) = score(team ∪ candidate) − score(team)
```

Two React developers at 0.8 give `1 − 0.2 × 0.2 = 0.96`, not 1.6. So the
**second React developer moves coverage 0.80 → 0.90, while the designer you do
not have moves it from 0.** Diminishing returns is not a rule bolted on top —
it falls out of the maths, which is why the ranking cannot be gamed by piling
on more of the same person.

`marginalGain` is the single number behind every ranking and every explanation
in the UI: candidate order, the gap feed, auto-draft, and the chips that say
"fills Designer" or "Rohan already covers Frontend".

### How the statement maps to the model

| The statement asks for | Where it lives in the score |
| --- | --- |
| Skills | `p_eff` per claim, damped to 0.6× without a proof link |
| Project requirements | Weighted slots, each with a minimum proficiency floor |
| Availability | `overlap` — weekly minutes **all** members share, capped at 10h |
| Experience | `balance` — 1 − variance of experience levels |
| Commitment | `commitment` — 1 − spread between the keenest and the least keen |
| Interests | The events corpus, and `scarcity` in each person's Guild Score |
| "Who is available or interested" | The gap feed: open squads ranked by *your* marginal gain |

Self-reported skill tags are the least reliable thing on any profile, so a
claim backed by a repo or past project counts in full and an unbacked one
counts at 0.6×. Credibility is modelled, not assumed.

## See it in 60 seconds

1. Open <https://tryguild.vercel.app> — you are straight in, no account.
2. **Team Board** → open **CropGuard — on-device crop disease detection**.
3. The squad sits at **55%**, with three open slots pulsing.
4. Look at the ranked candidates: **Meera Pillai (figma) is +7.8% and fills
   Designer**, ranked above four React developers who would each add ~1%.
   That is the thesis on screen.
5. Press **Auto-draft** and watch the greedy picks land one at a time and the
   coverage climb.
6. Read the **Team X-ray** — bus factor, availability dead zones, commitment
   mismatch.
7. **People** → any profile shows a Guild Score broken into credibility,
   versatility and scarcity, plus who complements you and which squads need you.

## Architecture

```
app/(app)/         Server Components — thin, no business logic
lib/queries/       the only place Supabase is read (service client, per request)
lib/engine/        the scoring engine — PURE TypeScript, ZERO imports
supabase/          schema and migrations
```

`lib/engine` imports nothing: not React, not Supabase, not Node. Plain objects
in, plain objects out. That is deliberate — it makes the maths testable in
milliseconds, lets the same code run on the server for ranking and in the
browser for the interactive sandbox, and means the product's core idea has no
framework dependency at all.

| Route | What it does |
| --- | --- |
| `/teams` | Team Board — squads ranked by what *you* would add |
| `/squad/[id]` | The sandbox: open slots, ranked candidates, auto-draft, risks |
| `/people` | The pool, ranked by Guild Score |
| `/p/[handle]` | Profile: score breakdown, complementarity, gap feed |
| `/`, `/events`, `/hackathons` | The event corpus a squad forms around |

## Running it

```bash
npm install
npm test          # 185 tests across 19 files
npm run dev
```

Seeding a fresh database (idempotent — safe to re-run):

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... node seed/seed-demo.mjs
```

The seed is shaped to make the maths visible: React is deliberately
over-supplied and figma/pitching deliberately scarce, so a candidate list
demonstrates diminishing returns rather than asserting it.

## Testing

`npm test` runs 185 tests across 19 files. The engine tests pin the thesis
rather than the implementation — that `coverage(0.8, 0.5)` is exactly `0.9`,
that an unverified 0.8 claim contributes `0.48`, that a claim below a
requirement's floor contributes nothing, that a duplicate always scores below a
gap-filler, and that auto-draft is deterministic across runs.

## Security posture

**This build has no authentication, on purpose**, because it is a judge-facing
demo that must open without an account. Being explicit about what that means:

- `middleware.ts` is a pass-through; `lib/auth/server.ts` returns one stand-in
  user so the shell keeps working.
- That user is a **member, not an admin**. `isAdmin()` defers to the real role
  check, so `/admin` stays closed. Removing a login step and granting every
  visitor the corpus-editing screens are different decisions, and only the
  first was intended.
- The app runs on the Supabase **publishable** key, which is public by design.
  It points at a throwaway demo database holding generated seed data whose
  tables carry open policies. **No service-role key exists in this build**, and
  no production data is reachable from it.
- Restoring real auth is a revert of three files — `middleware.ts`,
  `lib/auth/server.ts`, `lib/auth/roles.ts` — plus tightening the demo policies
  and setting `SUPABASE_SERVICE_ROLE_KEY`.

See [SECURITY.md](SECURITY.md).

## Credit

Guild is built on **Olvable** (`ShaanGS/chennai-events`), my own event
aggregator for Chennai — its ingestion pipeline, design system and shell are
reused here as the surface a team forms around. The team-formation engine,
schema and screens are new.
