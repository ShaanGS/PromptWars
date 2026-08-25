# Architecture

Two systems share one database: a **batch pipeline** (GitHub Actions)
that writes events, and a **request-time app** (Vercel) that reads them.
Nothing request-time ever scrapes or scores; nothing batch-time ever
renders. The decisions behind each shape live in
[`docs/decisions/`](decisions/README.md).

## The pipeline (batch, GitHub Actions, daily 07:00 IST)

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

`scripts/healthcheck.ts` (3×/day) keeps the free-tier DB awake and fails
loudly when an enabled source has no successful run in 48h.

## The app (request time, Vercel)

```
middleware.ts — getUser() per request; fails closed; no sign-up
   │            [decision 001]  public: /login, /auth, /e/  [decision 008]
   ▼
app/(app)/ — the member shell (sidebar, tabs); being inside the
   │         route group IS the auth boundary
   │         feed(/) · events · hackathons · calendar · saved ·
   │         sources · interests · settings · welcome · admin · design
   ▼
lib/queries/ — every read; deadline-kind and muted sources excluded
   │             from list surfaces, never from Saved/Mine [decision 006]
   ▼
lib/ranking.ts — per-user fit over the rows already fetched;
                 rank = quality × (0.7 + 0.3·fit)          [decision 005]

app/(app)/actions.ts — mutations (server actions), session-verified
app/e/[id]/ — the one public page + .ics                   [decision 008]
```

## Where does X live

| X                                 | Lives in                                                          |
| --------------------------------- | ----------------------------------------------------------------- |
| Source registry, crawl settings   | `config/sources.ts` (git-owned; seeded to DB — decision 009)      |
| Luma calendar list                | `config/luma-calendars.ts` (curated; verify with `luma:check`)    |
| Interest profile / scoring rubric | `config/interest-profile.ts` (its hash invalidates cached scores) |
| Interest tags for onboarding      | `config/interest-tags.ts`                                         |
| Fetch/parse per source            | `lib/connectors/<id>.ts`, registered in `lib/connectors/index.ts` |
| HTTP with crawl delay + UA        | `lib/http/fetcher.ts`                                             |
| Quality gates, geo, relevance     | `lib/pipeline/{quality,geo,relevance}.ts`                         |
| Date parsing and formatting       | `lib/dates/` (Asia/Kolkata everywhere)                            |
| Deadline vs start ("effective")   | `lib/events.ts`                                                   |
| Content/scoring hashes            | `lib/hash.ts`                                                     |
| LLM provider + failover           | `lib/llm/provider.ts`                                             |
| All reads                         | `lib/queries/` — one module per surface, API on the barrel only   |
| Per-user fit ranking              | `lib/ranking.ts`                                                  |
| Search/filter/pagination helpers  | `lib/filters.ts`                                                  |
| Auth helpers, roles, admin gate   | `lib/auth/{roles,server}.ts`, session gate in `middleware.ts`     |
| Admin user management             | `lib/admin/users.ts`, UI at `app/(app)/admin/`                    |
| Calendar math, ICS generation     | `lib/calendar.ts`, `lib/ics.ts`                                   |
| Excerpting (the legal rule)       | `lib/text.ts` `snippet()` (decision 007)                          |
| Image proxy/un-cropping           | `lib/images.ts`                                                   |
| Brand constants, traced logo      | `lib/brand.ts`, `lib/brand-paths.ts`, `brand/`                    |
| Canonical origin for URLs         | `lib/site.ts`                                                     |
| Design tokens                     | `app/globals.css` (+ `brand/design-tokens.json`)                  |
| UI primitives                     | `components/ui/` (reviewable at `/design`, admin-gated)           |
| Schema history                    | `supabase/migrations/NNNN_*.sql` (prose headers; never edited)    |
| Operational scripts               | `scripts/` (each self-documents; all `import './load-env'`)       |
| Workflows                         | `.github/workflows/{ingest,healthcheck,ci}.yml`                   |

## Main tables

`sources` (runtime copy of config) · `scrape_runs` (per-run status,
counts, gate results) · `raw_listings` (payloads as fetched) · `events`
(normalised, status: active / filtered_geo / filtered_quality, cached
score fields) · `user_interests` · `user_event_actions` (going / saved /
not-for-me) · `user_event_seen` · `user_source_mutes` · `access_audit` ·
`app_state` (profile hash etc.). History: `supabase/migrations/`.
