# Working agreement

For any agent (or human) working in this repo. Agreed with Shaan 2026-08-06
after a session that sprawled; formalised 2026-08-24; updated 2026-08-25 when
Guild was grafted in. `CLAUDE.md` points at this file.

## What this repo is

**The product is Guild** — a team-formation platform answering hackathon
Problem Statement 2 (ProjectMatch). It is built _inside_ Olvable, Shaan's
Chennai event aggregator (`ShaanGS/chennai-events`), which supplies the shell,
design system, ingestion pipeline and event corpus. Both halves are live and
both matter:

- **Guild** — `lib/engine/`, `lib/team/`, `lib/demo.ts`, `components/team/`,
  and the routes `/teams`, `/squad/[id]`, `/people`, `/p/[handle]`.
- **Olvable** — the pipeline (`lib/connectors/`, `lib/pipeline/`,
  `scripts/ingest.ts`), the reads (`lib/queries/`), and the event routes.

`lib/brand.ts` says `name: 'Guild'` and the running app says Guild. Strings
reading "Olvable" survive in a handful of places (`lib/ics.ts` PRODID,
`app/layout.tsx` `appleWebApp.title`, `/settings` copy, `/design`'s title,
`demo@olvable.app`) — those are stale, not the intended name. "EventNadu" is
dead and must not appear in anything new.

Read [`README.md`](README.md) for the product thesis and
[`SECURITY.md`](SECURITY.md) for why there is no login.

## The four rules

1. **Plan before code.** Write the plan, agree it, then implement. Feature
   plans live in `docs/ROADMAP.md`; a session starts from an agreed roadmap
   item, not from an idea mid-conversation.
2. **One feature per session.** Do not mix infrastructure and features. A
   hygiene commit must not change behaviour — a behaviour change hidden in a
   cleanup is the first thing a reader distrusts.
3. **Verify against the live system, never assume.** Nearly every bug in this
   project was found by running something, not by reading code. The session is
   not done until the live check in the plan has been run.
4. **State facts, not hopes.** "It is live" only after the headers or the logs
   say so. "Tests pass" only after they ran.

## Verification

- Every session plan ends with a **Verify** block; run it, don't skim it.
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`
  pass before commit — the same set CI runs on every push.
- Pure logic gets a Vitest test next to the module (`foo.test.ts`).
  `vitest.config.ts` picks up `lib/**/*.test.ts` and `lib/**/__tests__/`, so a
  pure helper is testable the moment it lives under `lib/`. That is a reason to
  extract one out of a component rather than leave it there.
- **The engine is the thing that must not regress.** `npx vitest run lib/engine`
  is 17 tests over the scoring model. They pin the _claims_ — probabilistic-OR
  coverage, the 0.6 unverified damp, the proficiency floor, gap-beats-duplicate,
  deterministic auto-draft — not the implementation. If a change makes one fail,
  the product's thesis changed; say so out loud rather than editing the test.
- Connectors are additionally checked against the live site with
  `npm run connector:test -- <source>` — fixtures catch our regressions, only
  the live run catches the remote site changing, which is the failure mode that
  actually happens.
- **There is no auth to verify.** The old recipe (create a throwaway account,
  sign in from incognito, walk the gates) cannot run in this build: there is no
  login and `npm run user:create` needs a service-role key that does not exist
  here. Do not write plans that depend on it.

## The voice of comments

Comments in this codebase record **why**, never what. The house shape: the
decision, the failure it prevents, and — when it was learned the hard way — the
date. Example from `lib/pipeline/geo.ts`: the OUT_OF_SCOPE list explains that
without it, the classifier dropped a real Chennai hackathon at "Freshworks", a
venue string with no geographic signal.

Do not add comments that narrate the code, cite the change that added them, or
argue the change is correct. Match the density that is already there; if a
module carries a header explaining its reason to exist, keep it accurate when
the reason shifts.

## Product rules that look like style but are not

- **`lib/engine/` imports nothing.** Not React, not Supabase, not Node, not a
  date library — only its own siblings. That is what makes it testable in
  milliseconds and lets the identical code rank on the server and re-score in
  the browser. Adding one import to it is a product decision, not a
  convenience; do not.
- **Scoring changes are load-bearing.** The 0.60/0.15/0.15/0.10 weights, the
  `0.6` unverified damp and the `UNMET_THRESHOLD` of 0.5 are the submission's
  argument. Changing a constant changes what the demo demonstrates — plan it,
  don't tune it.
- **Auth is stubbed, authorization is not.** The stand-in user is a `member`.
  Do not "simplify" `isAdmin()` to `true`, and do not add flows that assume a
  session, an email address or a password. See `SECURITY.md`, which also lists
  the one place the intent is not yet enforced.
- Nothing is silently deleted in the pipeline: filtered rows keep a status
  (`filtered_geo`, `filtered_quality`) so the UI can prove nothing real was
  thrown away.
- No env var becomes `NEXT_PUBLIC_`. This build holds no service-role key, but
  the rule stands for the day one returns.
- Free-tier limits (Vercel 300s functions, Supabase pause-after-7-days, Groq
  org-level rate limits) are load-bearing constraints; check against them
  before proposing infrastructure.
- Config lives in git (`config/sources.ts`, interest profile); the DB is the
  runtime copy, and `npm run seed` resets it toward git — that direction, never
  the reverse.
- **No new npm dependencies** without an explicit decision. The engine has zero
  runtime dependencies and the app's list is already long enough to audit.

## Environment gotchas

- Windows, PowerShell-first machine, repo inside OneDrive. `npx` is blocked by
  execution policy — use `npx.cmd`. Bash one-liners with grep/cut over `.env`
  files are unreliable here.
- Claude's sandboxed shell shadows `%APPDATA%`, so it cannot see the real
  Vercel CLI login. Vercel account actions are run by Shaan in his own terminal.
- tsx compiles `scripts/` to CJS: **no top-level await** — wrap in `main()`.
  Scripts must `import './load-env'` first or env vars are missing.
  `server-only` cannot be imported by tsx scripts.
- `seed/*.mjs` are plain ESM run with `node`, not tsx, and take their config
  from the environment directly — they do not use `scripts/load-env`.
- **`.env.example` is not in the repo.** `.gitignore` puts `!.env.example`
  before the broader `.env*` rule, so the negation loses. Anything that tells a
  reader to copy it is wrong.
- Line endings are settled: the repo stores LF (`.gitattributes` `eol=lf`) —
  do not hand-flip endings or add per-file overrides.

## Where things are written down

- `README.md` — the product, the scoring model, the demo walkthrough, and how
  the problem statement maps onto the maths. The front door for a reviewer.
- `SECURITY.md` — the no-login posture, what it does and does not protect, and
  how to restore real auth.
- `docs/ARCHITECTURE.md` — both system maps (Guild's request path and Olvable's
  pipeline), and the "where does X live" table.
- `docs/ROADMAP.md` — what is next, one screen. The current session should be
  an item here before code starts.
- `docs/CHANGELOG.md` — what shipped, dated, newest first. A finished session
  adds its entry here, keeping what was learned by shipping it.
- `docs/decisions.md` — Guild's settled decisions (the scoring model, the demo
  posture), in the same ADR-lite spirit.
- `docs/decisions/` — Olvable's settled decisions, one file each, with an
  index. A change that fights one revisits the record explicitly. 001 and 008
  are marked superseded by this build.
- `docs/sessions.md` — the session handoff log, newest at top.
- `docs/target-product.md` — a **parked alternative direction**, not this
  build's plan. Read the banner at the top before acting on anything in it.
- `docs/REBUILD-PLAN.md` — the 2026-08-06 Olvable rebuild. History; gap
  statuses are updated in place rather than the text rewritten.
- `supabase/migrations/` — numbered SQL, prose header stating why, never edited
  after they have been applied. The Guild tables are **not** in here; see
  `supabase/guild/` and the caveat in `docs/ARCHITECTURE.md`.
