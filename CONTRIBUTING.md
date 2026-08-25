# Contributing

Start with [`README.md`](README.md) for what this is and how to run it,
and [`AGENTS.md`](AGENTS.md) for how work happens here — plan first, one
feature per session, verify live. Those rules apply to humans too; this
file is the recipes.

Before any commit: `npm run lint`, `npm run format:check`,
`npm run typecheck`, `npm run test` — CI runs the same set (plus a build)
on every push and PR, so a red check is never a surprise. `npm run format`
fixes what `format:check` flags.

## Run the pipeline locally

There is one database — the production Supabase project. No staging.
(`.env.local`'s template comments describe an `ALLOW_PROD_WRITES` guard;
as of 2026-08-24 no script actually enforces it, so treat every write
script as a prod write.)

- **Reading is always safe** — `npm run dev` and browsing touch nothing.
- **Parse without writing**: `npm run connector:test -- devpost` runs a
  connector against the live site and prints what it parsed. This is the
  default way to work on a connector.
- **Full ingest**: `npm run ingest -- devpost` writes real rows. The
  quality gates and content hashing make a re-run of an unchanged source
  a no-op, but treat it with the respect a prod write deserves.
- **Scoring**: `npm run score` spends LLM quota (capped per run). The
  daily GitHub Actions run normally covers this; run it locally only when
  testing scoring changes.

## Add a source

Adding source #11 should be one new file plus one line in the registry —
nothing else in the pipeline changes. In order:

1. **Check the site tolerates a scraper.** Honest user agent, robots.txt,
   a real crawl delay. A source that only works by impersonating a
   browser does not get added (ConferenceAlerts was deleted for exactly
   this; see migration 0012).
2. **Write the connector**: `lib/connectors/<id>.ts` implementing the
   `Connector` interface from `lib/connectors/types.ts`. Read a
   neighbouring connector first — `devpost.ts` is a clean example of the
   fetch → parse → `PartialEvent` shape.
3. **Register it**: one line in `lib/connectors/index.ts`.
4. **Configure it**: a `SourceConfig` entry in `config/sources.ts` —
   id, display name, `enabled`, crawl delay, user agent, default
   audience, and `kind: 'deadlines'` if listings are entered-by-a-cutoff
   rather than happening-at-a-time (the comment there explains the
   difference; it decides which surfaces show the rows).
5. **Prove the parse**: `npm run connector:test -- <id>` against the live
   site. For Luma calendars specifically, `npm run luma:check -- <slug>`
   first — a bad slug fails silently inside the connector.
6. **Sync and run**: `npm run seed`, then `npm run ingest -- <id>` (with
   the prod-writes guard set), then check the source's row on `/sources`
   and its events in the app.
7. Add the id to the per-source loop in `.github/workflows/ingest.yml`.

Tests: pure parsing helpers get Vitest coverage next to the module;
`lib/sources.test.ts` shows the pattern.

## Add a migration

Migrations are numbered SQL files in `supabase/migrations/`, applied by
hand, never edited after they have run.

1. Next number, descriptive name: `0013_short_reason.sql`.
2. **Prose header first.** Every migration here opens with a comment
   saying why it exists and what would break without it — read 0012 for
   the voice. This is the schema's decision log.
3. Apply it against the project: the Supabase SQL editor is the path
   that is known to work (`SUPABASE_DB_URL` is currently unset, so
   `psql "$SUPABASE_DB_URL" -f <file>` works only once that is restored).
   Then verify the effect with a real query, not by assuming.
4. If the migration retires something described in `docs/REBUILD-PLAN.md`
   or the roadmap, mark it done there (strikethrough + date is the house
   pattern), don't silently rewrite history.

## Add a page

- Member-facing pages live in `app/(app)/` — the route group provides the
  shell (sidebar, header) and everything inside it is behind the auth
  gate in `middleware.ts`. Public routes (`/login`, `/e/:id`) live
  outside the group; adding a public surface is a product decision, not a
  routing choice.
- Reads go through `lib/queries/` (one module per surface, public API on
  the barrel `index.ts` only); mutations are server actions in
  `app/(app)/actions.ts`. Per-user ranking is request-time and pure
  (`lib/ranking.ts`) — no per-user SQL or LLM calls.
- UI follows the agreed system: tokens in `app/globals.css` and
  `lib/brand.ts` (Inter, indigo accent, light only, mobile-first).
  Check new screens at phone width first; Shaan uses the app mainly from
  a phone.

## Verify with a throwaway account

The recipe for checking anything auth-facing (gates, onboarding,
first-login flows) without touching a real account:

1. `npm run user:create -- test-YYYYMMDD@example.com "a-password"` — no
   email is sent; the account works immediately.
2. Sign in from an incognito window, so your real session stays intact.
3. Walk the flow you changed: fresh accounts land in interest onboarding;
   admin-created ones are routed to `/settings` until the password is
   changed — confirm the gates you expect actually fire.
4. Delete the account from `/admin` when done (this is also a test of
   `/admin`). Every create/reset/delete lands in the `access_audit`
   table.

## What a PR / session write-up states

Facts, not hopes: which Verify steps ran and what they showed, which
checks passed, and anything observed but left out of scope — noted in the
roadmap rather than fixed on the sly.
