# Architecture

This repo is two products in one tree, sharing one database.

- **Guild** — the team-formation product, and what the submission is about. A
  pure scoring model, four read screens, and one form that writes.
- **Olvable** — Shaan's Chennai event aggregator, which Guild is built inside.
  A batch pipeline that writes events and a request-time app that reads them.

Nothing request-time ever scrapes or scores events; nothing batch-time ever
renders. The decisions behind Guild's shape are in
[`decisions.md`](decisions.md); Olvable's are in
[`decisions/`](decisions/README.md).

---

## Guild (request time)

```
supabase: profiles · skills · projects · requirements · memberships
   │
   ▼
app/(app)/{teams,squad/[id],people,p/[handle]}/page.tsx
   │   Server Components. createServiceClient() inline, named columns,
   │   independent reads batched with Promise.all.
   ▼
lib/team/mappers.ts — rows → engine values. THE boundary: snake_case →
   │   camelCase, PostgREST numerics-as-strings, jsonb availability
   │   validated defensively, weight clamped off zero. Nothing malformed
   │   is allowed past this line.
   ▼
lib/engine/ — PURE TypeScript, ZERO imports (only its own siblings)
   │   coverage.ts     p_eff = proficiency × (verified ? 1 : 0.6)
   │   score.ts        0.60·base + 0.15·overlap + 0.15·balance + 0.10·commitment
   │   marginal.ts     score(T ∪ c) − score(T), plus fills / duplicates
   │   autodraft.ts    greedy over marginalGain, deterministic
   │   recommend.ts    gapFeed, complementarity, peopleYouShouldMeet
   │   risk.ts         bus factor, dead zones, commitment gaps
   │   guildScore.ts   credibility · versatility · scarcity
   ▼
components/team/{squad-card,sandbox}.tsx
       sandbox.tsx re-runs the SAME engine in the browser on every click,
       with no API round trip — which is the point of the zero imports.

lib/demo.ts — who "you" are. There is no session (see SECURITY.md), so
       identity is one seeded handle, `aarav`, hard-coded so the demo is
       identical on every machine and after every reseed.
```

| Route         | What it renders                                                       |
| ------------- | --------------------------------------------------------------------- |
| `/teams`      | Team Board — squads ranked by `gapFeed`, i.e. by _your_ marginal gain |
| `/squad/[id]` | The sandbox: open slots, ranked candidates, auto-draft, Team X-ray    |
| `/people`     | The pool ranked by `guildScore`                                       |
| `/p/[handle]` | Profile: score breakdown, complementarity, gap feed                   |

Guild reads, with one exception: `/teams/new` posts a request. That is the
only write — `app/(app)/teams/new/actions.ts` inserts a project, its
requirements and the owner's membership, and undoes the project if the
requirements or the membership fail. Everything else recomputes from rows it
did not write.

The rules the form enforces live in `lib/team/new-squad.ts`, pure and tested,
because a requirement is what the engine scores: a weight of zero or a skill
spelled unlike the pool's produces a role nobody can fill, silently.

---

## Olvable's pipeline (batch, GitHub Actions, daily 07:00 IST)

```
config/sources.ts ──npm run seed──► sources table        [decision 009]
config/luma-calendars.ts ┘

scripts/ingest.ts — one invocation per source, so one broken
   │                connector cannot stop the others      [decision 002]
   ├─ reap stale runs, claim a scrape_run row
   ▼
lib/connectors/{allevents,luma,devfolio,devpost,unstop}.ts
   │    fetch (lib/http/fetcher.ts: crawl delay, honest UA) + parse
   ▼
raw_listings — every payload persisted, unconditionally   [decision 003]
   ▼
normalise — lib/text.ts (urls, titles, organizers),
   │        lib/dates/ (parse to Asia/Kolkata, precision)
   ▼
lib/pipeline/quality.ts — gates the upsert, not the raw:
   │        title/date ratios, volume vs trailing median, churn
   ▼
lib/pipeline/geo.ts — active | filtered_geo; two regimes  [decision 004]
   ▼
events table — upsert by content hash; unchanged rows untouched

scripts/score.ts — only stale rows (content/profile/version hash):
            keyword pass free, LLM for the middle,
            Gemini → Groq failover, capped per run        [decision 005]
```

`scripts/healthcheck.ts` (3×/day) keeps the free-tier DB awake and fails loudly
when an enabled source has no successful run in 48h.

## Olvable's app (request time)

```
middleware.ts — PASS-THROUGH in this build. No session, no gate.
   │            The original body (getUser() per request, fails closed) is
   │            in git history; see SECURITY.md.       [decision 001, retired]
   ▼
app/layout.tsx — the shell (sidebar, top bar, phone tabs). NOTE: the shell
   │             lives here, not in a route-group layout — there is no
   │             app/(app)/layout.tsx, and the route group carries no
   │             auth meaning.                          [decision 008, retired]
   ▼
app/(app)/ — feed(/) · events · hackathons · calendar · saved · sources ·
   │         interests · settings · admin · design
   │         + Guild's teams · squad/[id] · people · p/[handle]
   ▼
lib/queries/ — every Olvable read; deadline-kind and muted sources excluded
   │             from list surfaces, never from Saved/Mine [decision 006]
   ▼
lib/ranking.ts — per-user fit over the rows already fetched;
                 rank = quality × (0.7 + 0.3·fit)          [decision 005]

app/(app)/actions.ts — Olvable's mutations (server actions)
app/e/[id]/ — the single-event public page + .ics
```

Every route in this build is publicly reachable. `/admin/add` and
`/admin/discovery` check `roleOf(user) !== 'admin'` themselves; the surfaces
relying on `requireAdmin()` do not yet. [`SECURITY.md`](../SECURITY.md) has the
table and the fix.

## Where does X live

### Guild

| X                                  | Lives in                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The scoring model (all of it)      | `lib/engine/` — pure, zero imports, 17 tests                                                                           |
| Weights and thresholds             | `lib/engine/types.ts` — `WEIGHTS`, `UNVERIFIED_DAMP`, `UNMET_THRESHOLD`, `PROFICIENCY_FLOOR`, `OVERLAP_TARGET_MINUTES` |
| DB rows → engine values            | `lib/team/mappers.ts` (+ `PROFILE_COLUMNS` etc.)                                                                       |
| Who "you" are in the demo          | `lib/demo.ts` (`DEMO_PROFILE_HANDLE = 'aarav'`)                                                                        |
| Team Board card, readiness band    | `components/team/squad-card.tsx`                                                                                       |
| Interactive sandbox, auto-draft UI | `components/team/sandbox.tsx`                                                                                          |
| Engine tests                       | `lib/engine/__tests__/engine.test.ts`                                                                                  |
| Demo seed data (profiles, squads)  | `seed/seed-demo.mjs` (idempotent, plain ESM)                                                                           |
| Guild schema                       | `supabase/guild/*.sql` — **reference only, see below**                                                                 |

### Olvable

| X                                 | Lives in                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| Source registry, crawl settings   | `config/sources.ts` (git-owned; seeded to DB — decision 009)        |
| Luma calendar list                | `config/luma-calendars.ts` (curated; verify with `luma:check`)      |
| Interest profile / scoring rubric | `config/interest-profile.ts` (its hash invalidates cached scores)   |
| Interest tags for onboarding      | `config/interest-tags.ts`                                           |
| Fetch/parse per source            | `lib/connectors/<id>.ts`, registered in `lib/connectors/index.ts`   |
| HTTP with crawl delay + UA        | `lib/http/fetcher.ts`                                               |
| Quality gates, geo, relevance     | `lib/pipeline/{quality,geo,relevance}.ts`                           |
| Date parsing and formatting       | `lib/dates/` (Asia/Kolkata everywhere)                              |
| Deadline vs start ("effective")   | `lib/events.ts`                                                     |
| Content/scoring hashes            | `lib/hash.ts`                                                       |
| LLM provider + failover           | `lib/llm/provider.ts`                                               |
| Olvable reads                     | `lib/queries/` — one module per surface, API on the barrel only     |
| Per-user fit ranking              | `lib/ranking.ts`                                                    |
| Search/filter/pagination helpers  | `lib/filters.ts`                                                    |
| Auth stub, roles, admin checks    | `lib/auth/{server,roles}.ts` — see `SECURITY.md`                    |
| Admin user management             | `lib/admin/users.ts`, UI at `app/(app)/admin/`                      |
| Calendar math, ICS generation     | `lib/calendar.ts`, `lib/ics.ts`                                     |
| Excerpting (the legal rule)       | `lib/text.ts` `snippet()` (decision 007)                            |
| Brand constants                   | `lib/brand.ts` (`name: 'Guild'`), `brand/`, `public/guild-logo.png` |
| Design tokens                     | `app/globals.css` (+ `brand/design-tokens.json`)                    |
| UI primitives                     | `components/ui/` (catalogue at `/design`)                           |
| Schema history                    | `supabase/migrations/NNNN_*.sql` (prose headers; never edited)      |
| Operational scripts               | `scripts/` (each self-documents; all `import './load-env'`)         |
| Workflows                         | `.github/workflows/{ingest,healthcheck,ci}.yml`                     |

## Tables

**Guild:** `profiles` (handle, name, dept, year, bio, `experience_level`,
`commitment_level`, `availability_windows` jsonb, `looking_for`, `is_seed`) ·
`skills` (profile_id, skill, proficiency 0–1, `proof_url` — the null/non-null
that drives the 0.6 damp) · `projects` (owner_profile_id, `event_id` →
`events.id`, title, description, kind, effort, is_seed) · `requirements`
(project_id, skill, `role_label`, weight, `min_proficiency`) · `memberships`
(project_id, profile_id, status).

These five are what the app reads. Nothing in this repo creates, reads or
writes a `nudges` table, despite older notes referring to one.

`projects.event_id` points at Olvable's `events`, which is why a squad forms
around a real ingested hackathon rather than a placeholder.

**Olvable:** `sources` (runtime copy of config) · `scrape_runs` (per-run status,
counts, gate results) · `raw_listings` (payloads as fetched) · `events`
(normalised; status active / filtered_geo / filtered_quality; cached score
fields) · `user_interests` · `user_event_actions` (going / saved / not-for-me) ·
`user_event_seen` · `user_source_mutes` · `access_audit` · `discovery_leads` ·
`app_state`. History: `supabase/migrations/`.

### Caveat on `supabase/guild/*.sql`

Neither file is numbered into `supabase/migrations/`, and nothing in the repo
applies them — the demo database was built by hand. Read them as intent, not as
a description of what is deployed:

- `0001_schema.sql` declares its own `public.events` with a different shape from
  Olvable's (`source`, `external_url`, `host`, `mode`, `location`). The app reads
  Olvable's columns (`starts_at_local`, `is_online`, `city`), so this file cannot
  be applied on top of the migrations. It is also behind the live tables: it has
  no `projects.kind`, no `projects.effort` and no `profiles.looking_for`, all of
  which `seed/seed-demo.mjs` writes. Its `communities` and `community_members`
  tables, conversely, are used by nothing.
- `0002_rls.sql` describes ownership-scoped policies keyed on `auth.uid()`. The
  demo database does **not** carry them — its Guild tables have open `demo_all`
  policies applied by hand. Do not read that file as evidence the database is
  locked down; [`SECURITY.md`](../SECURITY.md) states what is actually deployed.

Folding the Guild tables into the numbered migration sequence is a tracked
roadmap item.
