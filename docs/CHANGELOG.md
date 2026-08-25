# Changelog

What shipped, dated, newest first. Each entry keeps the facts that were
learned by shipping it; the full session plans (scope, decision menus,
verify steps) live in git history — `git log docs/ROADMAP.md` before
2026-08-24 — and the rules they settled live in
[`docs/decisions/`](decisions/README.md). Guild's own decisions are in
[`docs/decisions.md`](decisions.md).

## 2026-08-25

- **`/teams/new` is a real form.** The Team Board's primary button led to a
  page explaining that posting was unbuilt; it now posts. Pick an event from
  the corpus or none, write the ask, add up to six weighted requirements —
  skill, what to call the role, how much it matters (1–5), and a minimum
  level. Submitting writes a project, its requirements and the owner's
  membership, and the squad is on the board and in the sandbox immediately.
  - **Every row says who could fill it, live.** As the floor moves, the row
    reports how many people in the pool clear it — computed in the browser by
    the engine's own `effectiveProficiency`, damp included, so the number is
    the ranking's answer rather than an approximation. A skill nobody claims
    is not rejected (posting for something rare is legitimate) but is said out
    loud before posting rather than discovered on an empty board after.
  - The rules are pure and tested in `lib/team/new-squad.ts` (19 tests). They
    exist because a requirement is not metadata: a weight of zero, a floor
    above 1, or `Machine Learning` where the pool says `machine-learning`
    produces a role nobody on earth can fill, and nothing downstream would
    say so.
  - Guild's first write. The insert is undone if the requirements or the
    membership fail — a project with no requirements renders as "Ready 100%".
  - The owner is still `lib/demo.ts`'s seeded identity; there is no session to
    read one from. That is the only line that changes when auth returns.

- **Hackathon cards show the real event artwork.** All 25 rows had
  `image_url` null, so every card rendered a flat pastel tile: the seed-time
  fetcher never read the artwork the three APIs publish (Devfolio
  `cover_img`, Devpost `thumbnail_url`, Unstop `logoUrl2`) and the seeder
  never carried the column. Backfilled by matching each existing record's
  `external_url` against the live APIs, so the corpus and its order do not
  move — `seed-demo.mjs` links squads to events by array index, and a
  re-fetch would silently re-point every squad at a different hackathon.
  20 of 25 carry one.
  - Devpost serves one shared grey `.gif` from `/assets/defaults/` for
    listings whose organiser uploaded nothing — 8 of 51 on the day. Skipped:
    the app's own placeholder at least varies its hue and carries the date.
  - Two bugs the images made reachable, both in `EventImage`. A cached image
    is already `complete` before React attaches its handlers, so `onLoad`
    never fired on a revisit and every square logo rendered blown up and
    cropped; the measurement now also runs from a ref callback. And a URL
    that 404s returned `null`, collapsing the card's media box and dropping
    the date and band chips onto the title; it keeps its frame.

- **Guild merged into Olvable.** The product is now **Guild**, a
  team-formation platform answering hackathon Problem Statement 2
  (ProjectMatch), built inside this repo. Olvable's shell, design system,
  components, event corpus and ingestion are untouched and are the
  surface a team forms around — a squad points at a real ingested
  hackathon via `projects.event_id`. Live at `tryguild.vercel.app`.
  - `lib/engine/` — the scoring model, moved over intact: pure TypeScript,
    zero imports, 17 unit tests. Coverage is a probabilistic OR
    (`1 − Π(1 − p_eff)`), so diminishing returns falls out of the
    arithmetic rather than being a rule that could be got wrong.
    Candidates are ranked by `marginalGain`, never by absolute strength —
    which is what makes a designer out-rank a fifth React developer.
  - `/teams`, `/squad/[id]`, `/people`, `/p/[handle]` — Team Board (ranked
    by `gapFeed`), the sandbox (open slots, ranked candidates, auto-draft,
    Team X-ray), the pool by Guild Score, and the profile breakdown.
    Read-only: no mutations, no forms, no server actions.
  - `lib/team/mappers.ts` is the only boundary between Postgres and the
    engine's purity, and is deliberately defensive — a malformed jsonb
    window or a zero weight reaching the engine would poison every score
    on the page.
  - Nav: Team Board and People added to `NAV_PRIMARY`; Team Board takes a
    phone tab, Calendar moves to sidebar-only.
- **Auth removed, authorization kept.** Judges must not hit a login, so
  `middleware.ts` is a pass-through and `lib/auth/server.ts` returns one
  stand-in user, keeping the twenty-odd call sites working and making the
  gate a three-file revert. **That user is a `member`, not an admin.** A
  subagent originally hardcoded `isAdmin() -> true`, which would have
  handed every anonymous visitor the corpus-editing and access-control
  screens — a different decision from "skip the login", and not the one
  asked for. It was reverted; `lib/auth/roles.ts` defers to `roleOf`.
  Learned writing this up: the intent is **not fully enforced** —
  `requireAdmin()` still returns the user unconditionally, leaving
  `/admin`, `/design` and seven admin server actions open. Stated in
  `SECURITY.md` rather than papered over, and now the top roadmap item.
- **Database.** Supabase project `guild` (`fjxgqiveolnnrslihodl`,
  ap-south-1) reset with Shaan's approval, carrying Olvable's schema plus
  `profiles, skills, projects, requirements, memberships`. Seeded by
  `node seed/seed-demo.mjs` (idempotent): 25 real hackathons from the
  Devfolio/Devpost/Unstop ingest, 40 profiles, 5 squads. React is
  over-supplied across 12 of the 40 and `figma`/`pitching` are scarce **on
  purpose** — a demo that asserts diminishing returns is a claim; one
  where the list visibly re-ranks after the first React dev joins is a
  demonstration.
  GOTCHA: no service-role key in this build. It runs on the publishable
  key and the demo tables carry open `demo_all` policies, applied by hand
  — `supabase/guild/0002_rls.sql` describes stricter policies that are
  **not** deployed. Safe only because the database is a throwaway holding
  generated data. Olvable's production project (1,328 real events, real
  user rows) is separate and was never touched.
- **Documentation rewritten to match** (same day). `README.md` had still
  been 152 lines about a Chennai events aggregator — no mention of Guild,
  the problem statement or the engine — which was the single largest
  thing a reviewer opening the repo cold would have got wrong. Added
  `SECURITY.md`; corrected `AGENTS.md` (it instructed agents that "the
  product is Olvable", which would have steered a fixer into renaming
  Guild), `CONTRIBUTING.md` (it described an auth gate and a route-group
  boundary that no longer exist), `ARCHITECTURE.md` (no Guild content at
  all), and `target-product.md` (it described a different codebase, down
  to a `src/` directory this repo does not have, and argued the
  submission was not what PS-2 asks for). Decisions 001 and 008 marked
  superseded. All demo numbers in the README are computed from the seed
  data through the engine, not asserted.

## 2026-08-24

- **AllEvents is feed-opt-in now** (Shaan: "mostly crappy", and the
  numbers agreed). 75 of its 95 upcoming listings already scored under
  the feed floor, and what cleared it was marketing copy gaming the
  scorer — a Dubai promo with a QR code scored 90. Keyword-rich ad copy
  is indistinguishable from a real event to a keyword scorer, so the
  fix is the source, not the threshold. The feed's default pool is now
  the curated sources only (Luma, the Bevy chapters, hand-picked): 39
  upcoming, 19 above the floor, 4 in Top picks — a tenth the volume and
  the point of the change. AllEvents stays fully present on All events,
  the calendar and search, and its chip brings it back into the feed.
  `feedOptIn` now documents its two reasons — volume (knowafest) and
  signal (allevents).
- **Google CSE dropped as a dependency.** An evening of 403s
  ("This project does not have the access to Custom Search JSON API")
  survived three API keys and two Cloud projects; the enablement layer
  said enabled while CSE's own backend refused. Not worth more of
  Shaan's evening. `npm run discover` now SKIPS cleanly when the keys
  are absent instead of exiting 1 -- a weekly red X for an optional
  feeder trains you to ignore the workflow list. The sweep, the leads
  table and /admin/discovery all stay; they work the moment any
  provider is wired in.
  Surveyed while looking for a keyless replacement, both rejected and
  worth not re-testing: **10times.com** (Cloudflare-challenges even
  robots.txt) and **dev.events** (fully open, `Allow: /`, but its
  Chennai page carries no Event JSON-LD). The premium/corporate tier
  genuinely has no crawlable aggregator -- which is exactly why it was
  missing, and why paste-to-event is the mechanism for it.
- **First hand-picked event.** Global Startup Summit 2026 (31 Oct,
  Holiday Inn Chennai OMR) found and verified against the organizer's
  own registration page, inserted through `buildManualRow` -- the same
  path /admin/add uses.
- **Bevy connector: GDG Chennai, Friends of Figma, MuleSoft Meetups.**
  One implementation, three sources — all three communities run on
  Bevy, whose robots.txt disallows `/api/` for `*`; the connector
  reads what the ALLOWED pages server-render into `__NEXT_DATA__`
  (chapter page for the upcoming list, per-event pages for the full
  object) and honours the published crawl-delay 2. Quirks caught by
  test: `is_virtual_event` was true on an in-person flagship, so a
  named venue outranks the flag; Friends of Figma's chapter title is
  literally "Chennai", so a city-only title falls back to the
  community name. New `sparse` config flag: a Bevy chapter between
  events returns zero upcoming, and zero is a normal OK run there —
  not a broken-scraper page (quality gate, connector:test and ingest
  all taught the same rule). First live ingest: Figma Make-a-thon
  (Ramapuram) and a MuleSoft × Salesforce meetup landed scored; GDG
  sat at its normal zero. AMA/CII/DevSparks-style ANNUAL summit sites
  stay served by discovery leads + paste-to-event — a scraper per
  once-a-year microsite is maintenance debt, not coverage.
- **Eventbrite connector, shipped off.** Survey first: robots.txt
  allows the /d/ browse pages for `*` while disallowing the internal
  search API — so the connector reads the Chennai browse pages'
  schema.org JSON-LD (~24 events/page, extractor shared with
  AllEvents) and never touches that API. Live check: 11/11 parsed and
  dated with the honest UA. `enabled: false` per Shaan — it sits in
  Sources until flipped (then also add it to the ingest.yml loop).
  Eventbrite quirk caught by test: the city sits where the venue
  belongs when the real venue is TBA, and "Chennai" is not a venue.
- **Discovery sweep.** Perplexity's trick, made repeatable: a weekly
  GitHub Action (`discover.yml`, Monday 08:00 IST) runs the
  hotel/summit queries in `config/discovery.ts` through Google's
  Custom Search JSON API — Google's index under Google's API terms,
  LinkedIn's servers never touched — and writes `discovery_leads`
  (migration 0013). Leads, never events: snippets routinely describe
  last year's edition, so /admin/discovery lists them for review and
  "Draft event" hands the text to paste-to-event prefilled. Dismissed
  leads never resurface (URL unique index + ignoreDuplicates).
  Connector-covered domains are filtered — a hit on lu.ma is not a
  discovery. Needs `GOOGLE_CSE_KEY`/`GOOGLE_CSE_CX` (free tier; the
  sweep uses ~14 of 100 daily queries).
- **Paste-to-event (/admin/add).** The LinkedIn gap, closed by a
  paste: the human who saw the post is the connector. Textarea → LLM
  drafts the fields (Gemini/Groq, temperature 0; extraction is a
  convenience, never a gate — failure leaves a hand-fillable form) →
  admin corrects → row joins the pipeline as source `manual`
  ("Hand-picked"), scoring 85 with the scorer told to keep its hands
  off (`.neq('source_id','manual')`): the human deciding an event
  matters IS the relevance judgment. Each add writes an ok
  scrape_run so /sources stays honest; healthcheck skips manual (no
  scraper to be stale). Geo classifier skipped — pasting IS the geo
  decision. Nav: Admin → Add event.
- **Prestige rank.** Shaan's rule, kept invisible: free + in-person +
  five-star venue → the feed's Top picks (rank +20, floor 82) — the
  venue is the signal, an organizer who books the Grand Chola and
  charges nothing is curating the room. `lib/venues.ts` pattern list
  and `prestigeRank()` in ranking; no filter, no badge, nothing in
  the UI names it. Junk can't ride it: sub-floor events never reach
  the feed. First live check found zero eligible events — and a
  trivia night at "Courtyard by Marriott" matching a naive /marriott/
  pattern, so mid-tier brands are explicitly excluded, by test. The
  events this rule is FOR (AMA, Kovaion, DevSparks at Hyatt) are not
  in our sources yet — the discovery program is on the roadmap.
- **Design pass, batch 1c.** Card heights in a row are even again — a
  regression from the swipe-away wrapper (the article stopped being
  the stretched grid item; `h-full` restores the chain). Feed section
  headings lose their decorative icons on Shaan's call. His end-of-day
  verdict stands on the record: the feed and cards still read
  "utterly AI made" — the next session is the art-direction redesign
  (roadmap, Next), not more mechanical polish.
- **Design pass, batch 1b.** /events collapses duplicate listings
  within the page — the "+1 listing" badge carries the count, so "see
  every listing" no longer means the same event rendered twice
  (`collapseDuplicates` moved to `queries/shared`). Sidebar header
  recut on Shaan's screenshot: wordmark lg and aligned to the nav
  icons' left edge, tagline dropped from the chrome — it lives on
  login and the link preview, where it's met rather than re-read.
- **Design pass, batch 1 — copy sloppiness.** Session opened by a live
  audit of all four screens (Shaan: all of them feel sloppy); findings
  in `design-punchlist.md`, mechanical ones fixed now, taste-level
  ones wait on his references. Fixed: `displayTitle()` strips
  whole-segment title junk ("Pitch to ivi | Virtual | August 24,
  2026, | 10:00 AM - 05:00 PM" → "Pitch to ivi") at every render
  site, tested against the live titles; keyword-pass "Matches x, y"
  reason lines off the cards (LLM prose reasons stay); deadline
  cutoff artifacts (12:01 AM / 11:59 PM) render date-only; unknown
  price renders no row instead of "Not stated"; detail action stack
  is one rhythm (full primary / two equal halves / full Share).
- **Link preview + detail button overflow.** `app/opengraph-image.tsx`
  (satori): ink card, the real traced wordmark, tagline in Inter
  SemiBold with "grass" in mint — Inter-SemiBold.ttf now lives in
  `brand/fonts/` (OFL) because satori can't use next/font, read via fs
  (Turbopack lacks asset-URL fetch) and traced into the deploy with
  `outputFileTracingIncludes`. Middleware exempts `/opengraph-image` —
  WhatsApp fetches with no cookies. And the detail-page bug from
  Shaan's screenshot: `grid-cols-[1fr_auto]` can't shrink below the
  button text, so "Add to Google Calendar" pushed ".ics" through the
  card edge; now `minmax(0,1fr)` + the shorter "Google Calendar"
  label, both detail pages. Verified 0px overflow at 375px.
- **New tagline: "Touch grass, professionally."** Shaan's pick from a
  quirky round after rejecting the safe round — "Everything happening.
  One place." retired everywhere (login, sidebar mark, meta, manifest,
  README), now sourced from `BRAND.tagline` instead of five hardcoded
  copies. Login footer trimmed to just "Invite-only." on his ask.
  `docs/design-punchlist.md` started as the evidence file for the
  design pass, seeded from his two screenshots.
- **Card copy hygiene**, from Shaan's screenshot of what "sloppy"
  means concretely: a Luma venue that is actually a URL no longer
  renders as the location ("Mon 7 Sep · https://…"), and the image
  overlay chip no longer prints "12:00 AM" for iCal all-day artifacts
  (`formatEventDate` already guarded this; the chip didn't).
- **Installable (PWA).** `app/manifest.ts` (standalone, canvas-grey
  splash and theme so launch doesn't flash white), icon set rasterized
  from the existing `app/icon.svg` via sharp — 192/512 plus maskable
  variants with the va mark in the safe zone — `appleWebApp` metadata
  for iOS, `themeColor` viewport. No service worker on purpose:
  installability no longer needs one, and an offline cache of a
  daily-updating feed shows stale events with confidence. Found on the
  way: the auth middleware redirected `/manifest.webmanifest` and the
  icon PNGs to /login — the OS fetches those without cookies, so they
  are now public paths.
- **Card exit rework** (same day — Shaan: "not smooth, very odd", and
  he was right twice over). v1 slid, tilted and collapsed in one 300ms
  ease-in; v2 split it into two chained phases (fly off right + fade,
  then close the gap). The real bug, found by `transitionend` logging
  on live: **Tailwind v4's `translate-x-*` sets the CSS `translate`
  property, which `transition-transform` does not cover** — the card
  was snapping sideways instantly with only the fade animating. Fixed
  with `transition-[translate,opacity]`; phase chaining listens for
  `translate`'s own transitionend (own-element only — it bubbles from
  every hover inside the card). Verified live: slide ends at +296ms,
  collapse chains 2ms later, 483px→0. Burst bits also staggered
  (0–110ms delays, varied sizes) so they read as a burst, not a
  mechanism.
- **Card action feedback.** Shaan's ask, seeing the plain state flips:
  Going now pops (spring scale) and throws a six-bit burst in the
  pastel inks; Not for me swipes the card off the feed (slide + fade +
  height collapse via `CardShell`, feed only — /events and Saved keep
  skipped rows, so a swipe there would flicker back on revalidation).
  The swipe also covers a real gap: the server already removed skipped
  cards from the feed, so they popped out abruptly after the round
  trip. All keyframes inert under `prefers-reduced-motion`.
- **Settings: Browse card is phone-only now** (`lg:hidden`, the
  sidebar's breakpoint). It existed because phones have no sidebar,
  but rendered on desktop too — duplicating the sidebar and
  apologising for it in its own copy. Spotted by Shaan.
- **`ALLOW_PROD_WRITES` guard made real.** `.env.local` promised it on
  2026-08-06; now `scripts/guard.ts` enforces it: the six write scripts
  (seed, ingest, score, reclassify, user:create, admin:grant) refuse
  locally unless `ALLOW_PROD_WRITES=true`, with the exact override
  command in the refusal message. GitHub Actions is exempt via
  `GITHUB_ACTIONS=true`; `reclassify --dry` stays unguarded because a
  dry run writes nothing, as do the read-only scripts (healthcheck,
  connector:test, luma:check). Verified: seed refused (exit 1) then ran
  with the flag; dispatch of `ingest.yml` confirmed Actions unaffected.
  Only 'true'/'1' count as consent — 'yes' does not, by test.
- **Domain attach done.** Shaan added `olvable.vercel.app` +
  `SITE_URL` in the Vercel dashboard; verified live (307 → /login with
  the app's security headers).
- **4.5 Knowafest connector, feed-opt-in.** First of the Phase 4 source
  trio: `lib/connectors/knowafest.ts` parses the server-rendered TN
  state page table (one request, ~110 rows; first actual use of the
  cheerio dep). Rows carry date · name · types · college · city, so
  per-fest pages are never fetched; uid is the `YYYY/MM/NNNN-slug` path
  so annual editions stay distinct. Live run: 110/110 parsed and dated,
  0 geo-filtered. Scored: 57 of 107 upcoming fests above the feed
  floor — which is why the source shipped **feed-opt-in** (decision
  011, Shaan's call mid-go): a `feedOptIn` flag in `config/sources.ts`,
  applied by `feedSourceIds()` so the feed's default view and all its
  counts exclude the source unless its chip is the active filter. All
  events and the calendar include it normally. Verified against the
  live DB: default feed pool unchanged at 130; the chip surfaces 107.
  FDPs/culturals kept and scored per decision 004's precedent, not
  dropped at the connector.
- **Domain: `olvable.vercel.app` adopted.** Confirmed unclaimed, chosen
  as the canonical URL; crawler UA contact and docs updated. The attach
  itself (Vercel → project `kairoevents` → Settings → Domains) and
  `SITE_URL=https://olvable.vercel.app` (Production env) are Shaan's
  dashboard clicks — the MCP connector exposes no domain tool. Old URL
  stays attached.
- **4.4 Code structure** (no behaviour change — **Phase 4 complete**).
  `lib/queries.ts` (777 lines) split into `lib/queries/` — one module
  per surface (feed, events, hackathons, sources, saved, calendar,
  detail, public) over a `shared.ts` of internals, public API unchanged
  on the barrel (`index.ts`); export parity checked name-by-name.
  `lib/events.ts` now type-imports `EventRow` from `queries/shared`
  directly, so the old queries↔events circular edge is gone. Crawler UA
  fixed: `olvable/0.1` with the live app as contact URL — the GitHub
  repo is private, so linking it would 404 for exactly the person a
  contact URL is for; `luma-check` now shares the config constant
  instead of hardcoding its own. Next-template SVGs deleted from
  `public/`; dangling `sweep` script entry removed; `scripts/README.md`
  added. Verified live, signed in as a throwaway (deleted after, with
  its audit rows): feed, /events (+ stale-page clamp to 121–130 of
  130), /hackathons (143 open), calendar both scopes, /saved,
  /sources, detail, and signed-out /e/ (200 + OG, bogus id 404, .ics).
  Found on the way, environment not app: the in-app Browser pane never
  fires rAF, so React's batched suspense reveal (`$RB`/`$RV`) leaves
  streamed content hidden — flush manually when verifying there.
- **4.3 Docs restructure.** ROADMAP split into a one-screen roadmap,
  this changelog and `docs/decisions/` (ADR-lite, indexed);
  `docs/ARCHITECTURE.md` added (pipeline + app maps, where-does-X-live);
  `REBUILD-PLAN.md` marked as history.
- **4.2 CI and formatting.** `ci.yml`: lint + format:check + typecheck +
  test + build on push/PR, Node 24, no secrets (build verified to pass
  without `.env.local` — every route is dynamic). Prettier pinned to the
  house style; `.editorconfig`; `.gitattributes` `eol=lf` (the repo was
  already LF — the warnings were working-copy conversion). Formatting
  sweep: 89 files, checks identical before/after. No pre-commit hook
  (decision 010).
- **4.1 The front door.** `README.md` rewritten from the
  create-next-app stub; `AGENTS.md` created (CLAUDE.md's pointer now
  resolves); `CONTRIBUTING.md` added. Found while writing: the
  `ALLOW_PROD_WRITES` guard promised by `.env.local`'s comments is not
  implemented by any script (documented as a gap, not as fact), and
  `package.json` lists a `sweep` script whose file does not exist
  (→ 4.4).
- **3.10 Cleanup.** Migration 0012 drops `invited_emails` (magic-link
  era allowlist; nothing read it) and the ConferenceAlerts source row;
  code loses the source entry, `BROWSER_UA` and the fetcher's 403
  user-agent fallback. Its day-first date formats stay — generic and
  tested.
- **3.9 Public event share links** (decision 008). `/e/:id` + public
  `.ics`, OG unfurl (title, "24 Aug, 10:00 AM · Online", banner), Share
  button (native sheet only on coarse pointers; desktop copies),
  `robots.ts` allows only `/e/`. Structural find: `app/loading.tsx`
  streamed a 200 shell before any page could 404 — for curl AND the
  WhatsApp/Twitter/Facebook unfurlers — so member routes moved into the
  `(app)` route group (URLs unchanged) and `getPublicEvent` is checked
  in `generateMetadata`. `SITE_URL` fallback chain in `lib/site.ts`.

## 2026-08-23

One long day: Phase 1, all of Phase 2, and Phase 3 items 2, 3, 5, 6, 7
and 8.

- **3.8 Devfolio connector.** Public unauthenticated search API, fully
  open robots.txt; POST because the endpoint takes an ES-style query.
  Returns a real start AND `reg_ends_at`, full postal address and
  structured country — the best-shaped hackathon source. First run: 24
  listings, 8 in scope; page 140 → 147.
- **3.7 Hackathons, local** (decision 004). In person ⇒ Tamil Nadu
  (`requireLocal` for national sources); online ⇒ technical, floor 40
  (`ONLINE_FLOOR` — the one band where the model is reliable). Quizzes
  dropped at the Unstop connector (39 of 371). `npm run reclassify`
  added because ingest cannot re-judge rows it does not re-fetch
  (400-cap vs Unstop's ~500; 32 rows moved on first pass). Result:
  327 → 140 open entries, all 47 in-person ones Tamil Nadu campuses.
- **3.6 Hackathons** (decision 006). `kind: 'deadlines'` on sources;
  `/hackathons` keyed on `registration_deadline`; excluded from feed /
  All events / calendar Everything, never from Saved/Mine. Migration
  0011 fixes `source_health()` counting only future starts (healthy
  Devpost read as broken). `effectiveInstant`/`effectiveLocal` in
  `lib/events.ts` fix start-vs-cutoff on cards, Saved and calendar.
  Settings gains Browse links (All events · Hackathons · Sources) —
  the phone tab bar stays four items.
- **3.5 Sources page.** `/sources`: health + last run per source;
  per-user **Mute** (migration 0010, RLS owner policy) hiding a source
  from feed, All events and calendar Everything — never Mine/Saved.
- **Onboarding + interests.** Twelve tags (`config/interest-tags.ts`),
  `user_interests` (migration 0009), `/welcome` wizard gated by
  `app_metadata.onboarded`, `/interests` to edit, `lib/ranking.ts` fit
  layer (decision 005). Seed taps saved as Interested.
- **3.2 All events.** `/events`: full list, 30/page server-side
  pagination, Soonest/Best match sort, search extended to description;
  feed's silent 60-cap becomes an honest "browse all →" link.
- **2c.5 Calendar.** URL-driven `/calendar?view=&date=&scope=`;
  Day/Week/Month; Mine vs Everything (≥60 + your own); event sheet;
  `.ics` per event (auth-gated) built by `lib/ics.ts`; pure range math
  in `lib/calendar.ts` (19 tests). Midnight "instants" render as
  all-day. Desktop week = 7 stacked-block columns, no hour axis (~half
  of dated events are day-precision; a grid would be mostly empty).
- **2c.4 Event detail + the legal rule** (decision 007). ≤280-char
  labelled excerpt with link out — never stored prose; sticky action
  card; pill row. Fixed: "Closes closes today", "Chennai, Chennai".
- **2c.6 Saved / 2c.7 Settings + Admin restyles.** Past events collapse
  behind `?past=1`; Sign out lands on Settings' account card (the phone
  previously had no way out). Admin restyled on the primitives.
  **Phase 2 complete.**
- **2c.1–2c.3 Login, shell, feed.** Light sidebar; bottom tabs
  Feed · Calendar · Saved · You; 16:9 never-crop `EventImage`
  (off-ratio banners whole on a blurred self-copy; AllEvents fetched
  un-cropped via their proxy); Unicode-bold titles folded (NFKC);
  tiers 80+ / 60–79 / collapsed.
- **2a/2b Design system.** Direction agreed ("wonderful, I like it"):
  Inter 400/500/600, cool off-white canvas, indigo `#5B5BD6` accent,
  six pastels, light only, 390px-first. Tokens in `app/globals.css`,
  primitives in `components/ui/`, `/design` review page (admin-gated).
  Scale bumped same day after Shaan flagged sizes. Final logo artwork
  adopted after close: lowercase wordmark, "va" ligature mark, traced
  to SVG paths by `brand/trace.py` — do not redraw; re-run the script.
- **Phase 1 Admin + access control** (decision 001). Roles in
  `app_metadata`; `/admin` create/reset/revoke/restore/audit;
  revoke = ban, lockout verified immediate; `must_change_password`
  gate; first admin granted at the terminal. Learned live: Supabase
  MERGES `app_metadata` — write `false` explicitly; format relative
  times on the server or hydration mismatches.

## 2026-08-06

- **Rebuild decision + rename.** Keep the repo and pipeline, rebuild the
  app layer. EventNadu → **Olvable**. Working agreement written
  (plan first, one feature per session, verify live, facts not hopes) —
  now maintained in `AGENTS.md`.

## 2026-08-05

- **Deploy fixed permanently.** Root cause: the Vercel project sat on a
  team whose GitHub identity could never see the repo. Moved to the
  personal team; push → build → live has worked since.
- **Magic links removed** (decision 001): free-tier SMTP ~1 mail/min
  meant second clicks 429'd. Email + password, admin-created.

## 2026-07-25

- Project started: Chennai/Tamil Nadu event aggregation pipeline
  (AllEvents, Luma), Supabase, scoring, first dashboard.
