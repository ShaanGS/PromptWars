# Olvable

**Touch grass, professionally.** Olvable aggregates tech, startup and
maker events across Chennai and Tamil Nadu — meetups, conferences,
hackathons, competition deadlines — scores them for relevance, and serves
them as a private, invite-only feed with a calendar, saved lists and
per-user interests.

It exists because the alternative is checking Luma, AllEvents, Devfolio,
Devpost and Unstop by hand and still missing things. It is a personal
product run for a small circle: there is no sign-up page, accounts are
created by the admin, and the public surface is exactly one page
(`/e/:id`, a shareable event link).

Live at <https://olvable.vercel.app> (the older
`kairoevents-beta.vercel.app` URL stays attached and keeps working; the
Vercel _project_ still carries its pre-rename name, which is cosmetic).

## Stack

| Layer     | Choice                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| App       | Next.js 16 (App Router) · React 19 · TypeScript                                                              |
| UI        | Tailwind CSS 4 · Base UI · shadcn patterns · Phosphor icons                                                  |
| Data      | Supabase — Postgres + Auth, `ap-south-1`                                                                     |
| Hosting   | Vercel (`bom1`), Hobby tier                                                                                  |
| Ingestion | GitHub Actions (daily, 07:00 IST) — **not** Vercel Cron; Hobby's 300s function cap cannot fit a polite crawl |
| Scoring   | Gemini (primary) with Groq failover, behind a keyword pass that answers most listings for free               |
| Tests     | Vitest — pure logic only (dates, geo, ICS, filters, hashing, text)                                           |

Node 24. No self-hosted services, no paid tiers; the free-tier limits are
design constraints throughout, not accidents.

## The data pipeline

```
config/sources.ts  ──seed──►  sources table (git owns config; DB is runtime)

GitHub Actions, daily
  scripts/ingest.ts  — per source, so one broken connector stops nothing else
     │
     ▼
  lib/connectors/*   fetch + parse (allevents, luma, devfolio, devpost, unstop)
     │                 raw payloads persisted to raw_listings unconditionally
     ▼
  normalise          canonical URLs, titles, organizers, dates (lib/text, lib/dates)
     ▼
  quality gates      lib/pipeline/quality.ts — catches the real failure mode:
     │               a changed selector returning 40 rows of empty titles
     ▼
  geo classify       lib/pipeline/geo.ts — out-of-area rows get status
     │               'filtered_geo', never deleted, so the app can prove
     ▼               nothing real was thrown away
  upsert events      content-hashed; unchanged rows untouched
     ▼
  scripts/score.ts   keyword pass first, LLM only for the ambiguous middle;
                     scores cached by content + profile hash

Request time (Vercel)
  middleware.ts      auth gate — session refresh, no sign-up, fails closed
     ▼
  app/(app)/*        feed, events, hackathons, calendar, saved, sources,
     │               interests, settings, admin
     ▼
  lib/queries/       reads; lib/ranking.ts layers per-user fit on the
                     global score at request time (no SQL, no LLM per user)
```

Two shapes of listing: **events** (something happens at a time and place)
and **deadlines** (hackathons/competitions you enter before a cutoff —
these live on `/hackathons` and stay out of the feed and calendar; see
`config/sources.ts` for the full reasoning).

## Run it locally

```bash
git clone https://github.com/ShaanGS/chennai-events.git
cd chennai-events
npm install
# create .env.local — see the table below
npm run dev
```

Then create yourself an account (there is no sign-up):

```bash
npm run user:create -- you@example.com "a-password"
npm run admin:grant -- you@example.com
```

and sign in at <http://localhost:3000>. The dev server reads the shared
Supabase project — there is no staging database. Browsing is safe;
running ingestion scripts locally writes real rows (see
`CONTRIBUTING.md` before doing that).

### Environment variables

All server-side. **None are `NEXT_PUBLIC_`** — the service role key must
never reach the browser.

| Variable                    | What it is                                                                                                        | Who reads it                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `SUPABASE_URL`              | Supabase project URL                                                                                              | app + scripts                    |
| `SUPABASE_ANON_KEY`         | Public-by-design auth key; RLS bounds what it sees                                                                | middleware, auth                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely — treat as a password                                                                       | server queries, pipeline scripts |
| `SUPABASE_DB_URL`           | Direct Postgres (port 6543, Supavisor transaction mode)                                                           | migrations, backups              |
| `GEMINI_API_KEY`            | Scoring, primary                                                                                                  | `scripts/score.ts`               |
| `GROQ_API_KEY`              | Scoring, failover. One key only — Groq limits per org, extra keys multiply nothing                                | `scripts/score.ts`               |
| `ALLOW_PROD_WRITES`         | Declared as a write guard in `.env.local`'s template comments, but **not yet enforced by any script** — known gap | (nothing, yet)                   |
| `SITE_URL`                  | Canonical origin for metadata and share links                                                                     | `lib/site.ts`                    |

The same values are set as GitHub Actions secrets for the ingestion
workflows, and in Vercel for the app.

### Scripts

| Command                               | What it does                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`     | Next.js                                                                          |
| `npm run lint` / `typecheck` / `test` | The checks that must pass before any commit                                      |
| `npm run ingest -- <source>`          | One source, end to end (fetch → gates → upsert)                                  |
| `npm run score`                       | Score unscored/stale events (keyword pass, then LLM)                             |
| `npm run seed`                        | Push `config/sources.ts` + profile hash into the DB                              |
| `npm run reclassify -- <source>`      | Re-run geo rules over stored rows (`--all --dry` supported)                      |
| `npm run connector:test -- <source>`  | Parse the live site, touch no DB — catches the remote site changing              |
| `npm run luma:check`                  | Verify Luma calendar slugs before configuring them                               |
| `npm run healthcheck`                 | Keep-alive ping + alert if a source has no successful run in 48h                 |
| `npm run user:create -- <email> <pw>` | Create or re-password an account (terminal fallback; `/admin` is the normal way) |
| `npm run admin:grant -- <email>`      | Bootstrap the admin role — deliberately terminal-only                            |

## How accounts work

Email + password, no sign-up, no email sending at all. The admin creates
accounts from `/admin` (or `scripts/create-user.ts` at the terminal); the
account existing _is_ the invite. A user on an admin-set password is
routed to `/settings` until they choose their own; first login walks
through interest onboarding. Admin is granted once, at the terminal, by
`npm run admin:grant` — there is no grant-admin UI on purpose.

## Where to read next

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — add a source, add a migration, add a page, verify like this project verifies.
- [`AGENTS.md`](AGENTS.md) — the working agreement (plan first, one feature per session) and environment gotchas. Applies to humans too.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the pipeline and app maps, and the "where does X live" table.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what is next, one screen.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — what shipped, dated, newest first.
- [`docs/decisions/`](docs/decisions/README.md) — the settled decisions, one short file each, indexed.
- [`docs/REBUILD-PLAN.md`](docs/REBUILD-PLAN.md) — the 2026-08-06 rebuild, kept as history.
- `supabase/migrations/` — numbered SQL, each with a prose header saying why.

One naming note: the package/repo slug is `chennai-events` (pre-rename,
kept stable); the product is Olvable.
