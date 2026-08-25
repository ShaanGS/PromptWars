# Contributing

Start with [`README.md`](README.md) for what this is and how to run it, and
[`AGENTS.md`](AGENTS.md) for how work happens here — plan first, one feature
per session, verify live. Those rules apply to humans too; this file is the
recipes.

Before any commit: `npm run lint`, `npm run format:check`, `npm run typecheck`,
`npm run test` — CI runs the same set (plus a build) on every push and PR, so a
red check is never a surprise. `npm run format` fixes what `format:check`
flags.

The repo is two products in one tree. Which recipe you need depends on which
half you are in:

- **Guild** — the scoring model and the team screens. Pure logic, no pipeline,
  no LLM, no writes.
- **Olvable** — the ingestion pipeline and the event screens. Batch jobs, live
  scrapes, real writes.

## Work on the scoring engine

`lib/engine/` is the submission's core and the only part of the repo with
serious test coverage. Rules for touching it:

1. **It imports nothing.** Only `./types`, `./coverage` and its other siblings
   — no React, no Supabase, no Node, no date library. Plain objects in, plain
   objects out. This is what lets the same code rank on the server and re-score
   in the browser, and what makes the tests run in milliseconds.
2. **Write the test first, and make it a claim.** The existing tests assert
   things like "`coverage(0.8, 0.5)` is exactly `0.9`" and "a gap-filler
   out-ranks a stronger duplicate". A test that just re-states the code is
   worth nothing here.
3. **Constants are decisions.** `WEIGHTS`, `UNVERIFIED_DAMP`,
   `UNMET_THRESHOLD`, `PROFICIENCY_FLOOR` and `OVERLAP_TARGET_MINUTES` in
   `types.ts` define what the demo demonstrates. Changing one is a roadmap
   item, not a tweak; record it in `docs/decisions.md`.
4. Run `npx vitest run lib/engine` while you work — it is a fifth of a second.

Anything pure belongs under `lib/`, because `vitest.config.ts` only collects
`lib/**` and `scripts/**`. A pure helper stranded inside a component file
cannot be tested where it sits — extract it to `lib/` rather than leave it
uncovered.

`lib/team/mappers.ts` is the boundary between Postgres and that purity. It is
deliberately defensive: a malformed availability window or a zero requirement
weight must be normalised there, because a `NaN` or a divide-by-zero reaching
the engine poisons every score on the page.

## Add a page

- Pages live in `app/(app)/`. The shell (sidebar, top bar, phone tabs) comes
  from `app/layout.tsx`, **not** from a route-group layout — there is no
  `app/(app)/layout.tsx`, and being inside the group carries no auth meaning.
- **There is no auth gate.** `middleware.ts` is a pass-through and every route
  is public; adding a page adds a public surface. See [`SECURITY.md`](SECURITY.md).
  If a page must be admin-only, gate it explicitly with
  `roleOf(user) !== 'admin'` **and** gate each of its server actions the same
  way — a server action is its own entry point and a page-level check does not
  cover it.
- Reads: Olvable's surfaces go through `lib/queries/` (one module per surface,
  public API on the barrel `index.ts` only). The four Guild pages deliberately
  call `createServiceClient()` inline instead, because they need whole-pool
  reads that `lib/queries/`'s event-shaped API does not express. Keep that line
  where it is rather than blurring it in either direction.
- Mutations are server actions in `app/(app)/actions.ts`. Guild currently has
  none — every team screen is read-only, which is why there are no form-label
  or CSRF findings on them.
- Name your columns in every `select()`; there is no `select('*')` in this repo
  and it should stay that way. Batch independent reads with `Promise.all`, and
  put an explicit `.limit()` with a reason on anything unbounded — the engine is
  superlinear downstream of a fetch, so an unbounded read is unbounded compute.
- UI follows the agreed system: tokens in `app/globals.css` and `lib/brand.ts`
  (Inter + JetBrains Mono, indigo `#5b5bd6` accent, light canvas `#f5f6fa`,
  mobile-first). Check new screens at phone width first; Shaan uses the app
  mainly from a phone.
- Accessibility is checked, not assumed. `app/globals.css` already provides a
  global `:focus-visible` ring — do not add per-component ones. New pages need
  a heading order that does not skip a level, an accessible name on every
  icon-only control, and a live region for anything that mutates the page
  without a navigation.

## Run the pipeline locally

The pipeline is Olvable's half and it writes real rows.

The demo database (`fjxgqiveolnnrslihodl`) is a **throwaway** seeded for the
submission — not Olvable's production project, which is separate and untouched.
Write scripts still deserve respect: the demo is what a judge sees.

Every write script calls `assertProdWritesAllowed()` from `scripts/guard.ts`
first, so a local run refuses unless you set `ALLOW_PROD_WRITES=true`. GitHub
Actions is exempt — ingestion is supposed to write from there. Read-only
scripts (`healthcheck`, `connector:test`, `luma:check`) are deliberately
unguarded: a guard that also blocks harmless reads trains you to always set the
flag, which unmakes the guard.

- **Reading is always safe** — `npm run dev` and browsing touch nothing.
- **Parse without writing**: `npm run connector:test -- devpost` runs a
  connector against the live site and prints what it parsed. This is the
  default way to work on a connector.
- **Full ingest**: `npm run ingest -- devpost` writes real rows. The quality
  gates and content hashing make a re-run of an unchanged source a no-op.
- **Scoring**: `npm run score` spends LLM quota (capped per run). The daily
  GitHub Actions run normally covers this; run it locally only when testing
  scoring changes.
- **Guild seed data**: `node seed/seed-demo.mjs` — plain ESM run with `node`,
  idempotent, upserts profiles/skills/projects/requirements/memberships. It
  takes `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the environment directly.

`npm run user:create` and `npm run admin:grant` **do not work in this build** —
they need a service-role key, and there is none. They are kept for the day auth
returns.

## Add a source

Adding source #11 should be one new file plus one line in the registry —
nothing else in the pipeline changes. In order:

1. **Check the site tolerates a scraper.** Honest user agent, robots.txt, a
   real crawl delay. A source that only works by impersonating a browser does
   not get added (ConferenceAlerts was deleted for exactly this; see migration
   0012).
2. **Write the connector**: `lib/connectors/<id>.ts` implementing the
   `Connector` interface from `lib/connectors/types.ts`. Read a neighbouring
   connector first — `devpost.ts` is a clean example of the fetch → parse →
   `PartialEvent` shape.
3. **Register it**: one line in `lib/connectors/index.ts`.
4. **Configure it**: a `SourceConfig` entry in `config/sources.ts` — id,
   display name, `enabled`, crawl delay, user agent, default audience, and
   `kind: 'deadlines'` if listings are entered-by-a-cutoff rather than
   happening-at-a-time (the comment there explains the difference; it decides
   which surfaces show the rows).
5. **Prove the parse**: `npm run connector:test -- <id>` against the live site.
   For Luma calendars specifically, `npm run luma:check -- <slug>` first — a
   bad slug fails silently inside the connector.
6. **Sync and run**: `npm run seed`, then `npm run ingest -- <id>`, then check
   the source's row on `/sources` and its events in the app.
7. Add the id to the per-source loop in `.github/workflows/ingest.yml`.

Tests: pure parsing helpers get Vitest coverage next to the module;
`lib/sources.test.ts` shows the pattern.

## Add a migration

Migrations are numbered SQL files in `supabase/migrations/`, applied by hand,
never edited after they have run.

1. Next number, descriptive name: `0014_short_reason.sql`.
2. **Prose header first.** Every migration here opens with a comment saying why
   it exists and what would break without it — read 0012 for the voice. This is
   the schema's decision log.
3. Apply it against the project: the Supabase SQL editor is the path that is
   known to work (`SUPABASE_DB_URL` is currently unset, so
   `psql "$SUPABASE_DB_URL" -f <file>` works only once that is restored). Then
   verify the effect with a real query, not by assuming.
4. If the migration retires something described in `docs/REBUILD-PLAN.md` or
   the roadmap, mark it done there (strikethrough + date is the house pattern),
   don't silently rewrite history.

**The Guild tables are not in `supabase/migrations/`.** They live in
`supabase/guild/0001_schema.sql`, which is not numbered into the sequence and
is not applied by anything in the repo — the demo database was built by hand.
That file also declares its own `public.events`, which collides with Olvable's.
Folding the Guild tables into the numbered sequence (minus that `events`) is a
tracked roadmap item; until then, treat `supabase/guild/` as a reference, not
as a runnable migration.

## What a PR / session write-up states

Facts, not hopes: which Verify steps ran and what they showed, which checks
passed, and anything observed but left out of scope — noted in the roadmap
rather than fixed on the sly.
