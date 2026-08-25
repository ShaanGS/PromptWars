# Roadmap

What is next, one screen. What shipped is in
[`CHANGELOG.md`](CHANGELOG.md); the rules already settled are in
[`decisions/`](decisions/README.md); how sessions run is in
[`AGENTS.md`](../AGENTS.md) — plan first, one feature per session, each
item below becomes a session plan before any code.

## Next

- **Feed + card redesign** (Shaan, 2026-08-24, after batch 1 of
  mechanical fixes shipped: the dashboard and cards still look
  "utterly AI made … cannot grab my attention, because of bad
  design"). This is the art-direction session, not more polish:
  card layout/hierarchy, stat tiles, section rhythm. It starts from
  his reference screenshots (Beam = reference #1) — collect them
  first, propose 2–3 distinct directions as mockups, let him pick.
  Evidence and fixed-items ledger: `design-punchlist.md`.
- **Premium-room discovery** (Shaan, 2026-08-24, from a Perplexity
  survey that found AMA CXO Summit / Kovaion Connect / DevSparks-type
  events our sources miss). The prestige-rank rule shipped 2026-08-24
  (free + in-person + five-star venue → Top picks floor, invisible —
  `lib/venues.ts`); **paste-to-event shipped same day** (`/admin/add`
  — LinkedIn's value without touching LinkedIn's servers; Shaan's
  first real paste is the live verification). What remains:
  1. **Search-API discovery — built, parked 2026-08-24.** The sweep,
     leads table and /admin/discovery all work; Google's CSE refused
     three keys across two projects and is not worth more time. It
     skips cleanly with no keys. Revive by wiring any search provider
     into `scripts/discover.ts` (Brave's free tier was the shortlist)
     — everything downstream is provider-agnostic.
  2. **Eventbrite connector — shipped 2026-08-24, off.** Sits in
     Sources; to turn on: `enabled: true` in config/sources.ts, add
     `eventbrite` to the ingest.yml loop, seed, push.
  3. **Organizer connectors — the recurring ones shipped 2026-08-24**:
     GDG Chennai, Friends of Figma and MuleSoft Meetups via one Bevy
     connector (`sparse` sources; zero upcoming is a normal run).
     Deliberately NOT built: scrapers for annual summit microsites
     (AMA, CII, DevSparks) — once-a-year sites are maintenance debt;
     the discovery sweep + paste-to-event cover them.
     Explicitly rejected from the Perplexity spec: `site:linkedin.com`
     search-dorking (hostile to LinkedIn's ToS and to our honest-UA
     rule), a parallel schema (ours already covers it), and any
     user-visible five-star filter/badge (Shaan: it must not look like
     we hunt hotels).
- Declined for now (2026-08-24): scoring provenance, ocgroups
  connector — "doesn't seem needed at all". Both stay in Later.

## Small, unblocked

- **Chennai chip on `/hackathons`** — offer if the in-person list starts
  reading as Vellore's (VIT Vellore was 18 of 47 at last count).
- **Scoring provenance** (REBUILD-PLAN gap 8) — record keywordPass vs
  LLM per score so the model's value can be measured.
- **`shaanvishy@gmail.com`** — if it is Shaan's own second account,
  grant it: `npm run admin:grant`.

## Blocked on a decision

- **Email provider** (Shaan): unblocks weekly digest / notifications
  and self-serve password reset — and makes the public page's
  "request access" idea honest. Until then: admin resets only.
- **Per-user secret URLs** (security decision): unblocks the
  subscribable ICS feed of saved events.
- **A real domain** (`olvable.com` / `.in` / `.app`) — a later purchase
  decision; `olvable.vercel.app` attached and verified live 2026-08-24.

## Later, when wanted

- New sources: `ocgroups`, `tie` sit disabled in `config/sources.ts`;
  each needs a connector honestly scraped (decision 004 applies —
  national vs local regime per source).
- Full CSP (`script-src` needs per-request nonces); login rate limiting
  beyond Supabase's server-side throttle.
- Restore `SUPABASE_DB_URL` in `.env.local` (migrations/backups via
  psql fail until then; the SQL editor is the working path).
- Hour-grid week view on the calendar — deliberately skipped while
  ~half of dated events are day-precision.
- Measure Going/Save rate per feed tier (needs data over time).

## Standing facts a plan must respect

Free tier everywhere (decisions 002, 005) · no email exists (001) ·
deadline sources never join the feed (006) · excerpts only (007) ·
one public page (008) · phone-first — Shaan uses it from a phone, and
the phone pass on live is his.
