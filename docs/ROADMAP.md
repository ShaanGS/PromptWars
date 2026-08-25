# Roadmap

What is next, one screen. What shipped is in
[`CHANGELOG.md`](CHANGELOG.md); the rules already settled are in
[`decisions/`](decisions/README.md); how sessions run is in
[`AGENTS.md`](../AGENTS.md) — plan first, one feature per session, each
item below becomes a session plan before any code.

## Next — Guild

The submission's own backlog. Everything below the "Next — Olvable" heading is
the aggregator's, and is parked while Guild is the product.

1. **Make `requireAdmin()` assert the role.** `lib/auth/server.ts` returns the
   stand-in user unconditionally, so `/admin`, `/design` and seven admin server
   actions are open to anyone — contradicting the posture stated in
   `lib/auth/roles.ts`, `SECURITY.md` and this repo's README. One function:
   assert `isAdmin(user)`, `redirect('/')` otherwise. Closes every call site at
   once. **Top priority; it is the one place the documented posture is not
   enforced.**
2. **`/teams/new` does not exist.** `app/(app)/teams/page.tsx` links to it twice
   (the header CTA and the empty state) and both 404. It is also the only
   "post what you need" affordance in the product, so the demand side of the
   problem statement currently has no entry point. Build it or drop the links.
3. **Wire up or delete `explainScore`.** `lib/engine/explain.ts` is tested but
   has **zero callers** — nothing in `app/` or `components/` imports it. It is
   exactly the "explain the score" affordance the sandbox should have;
   exported-and-unused is the worst of the three options.
4. **Nudges.** Guild can identify the right teammate and cannot let you contact
   them. This is the largest genuine capability gap. Sketch in
   `target-product.md` §2.
5. **Fold the Guild tables into `supabase/migrations/`.** They live in
   `supabase/guild/`, unnumbered and applied by hand, and that file's `events`
   collides with Olvable's. See the caveat in `ARCHITECTURE.md`.
6. **Extract and test the last two pure helpers.** `mappers.ts` and `demo.ts`
   are covered now; these are not, because they sit inside component files and
   `vitest.config.ts` only collects `lib/**` and `scripts/**`:
   - `readiness()` (`components/team/squad-card.tsx:37`) — four bands with
     boundaries at 85/60/35 and nothing asserting them.
   - The open-slot rule (`coverage < UNMET_THRESHOLD`) is **duplicated in three
     places** — `squad-card.tsx` and twice in `sandbox.tsx`. It is the
     product's core claim about which roles are open; three copies will drift.
     Extract `openRequirements(reqs, coverage)` into `lib/engine/`, where it
     belongs, and point all three at it.
7. **Performance, measured not asserted.** `guildScore` recomputes the same
   per-skill supply scan for every person on `/people`; `sandbox.tsx` re-runs
   `rankCandidates` and `teamRisks` unmemoized on every render, including every
   420 ms during auto-draft. Hoist the supply map, `useMemo` the sandbox, then
   check the "well under a millisecond" claim in that file's docstring is true.
8. **Accessibility.** `components/shell/page-header.tsx` renders a `<div>`
   where a `<main>` belongs — one word, fixes the missing landmark on every
   page. Then: the `h1 → h3` skip on `/people`, an `aria-live` region for
   auto-draft (it rewrites the page in silence today), and
   `role="progressbar"` on the score bars.

## Next — Olvable

Parked while Guild is the product. `olvable.vercel.app` is the aggregator's
own deploy; Guild is at `tryguild.vercel.app`.

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
  grant it: `npm run admin:grant`. Blocked in this build: that script
  needs a service-role key and there is none.

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

**Guild:** the engine imports nothing and must stay that way ·
`WEIGHTS` / `UNVERIFIED_DAMP` / `UNMET_THRESHOLD` are product decisions, not
tunables · there is no auth, but the stand-in user is a `member` — do not
"simplify" `isAdmin()` · Guild is read-only · no new npm dependencies.

**Olvable:**
Free tier everywhere (decisions 002, 005) · no email exists (001) ·
deadline sources never join the feed (006) · excerpts only (007) ·
phone-first — Shaan uses it from a phone, and the phone pass on live is
his. Decisions 001 and 008 are superseded in this build; the rest hold.
