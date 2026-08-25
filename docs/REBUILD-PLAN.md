# Olvable — rebuild plan and working agreement

> **Historical document** (2026-08-06, kept as written, gap statuses
> updated in place). It predates Guild entirely: where it says "the
> product is Olvable", read that as true of 2026-08-06 and superseded on
> 2026-08-25, when Guild was grafted in and became the product. The
> auth sections describe a system this build no longer has
> ([`../SECURITY.md`](../SECURITY.md)). The living versions are elsewhere: the working
> agreement and environment gotchas are maintained in
> [`AGENTS.md`](../AGENTS.md), settled decisions in
> [`decisions/`](decisions/README.md), what's next in
> [`ROADMAP.md`](ROADMAP.md), what shipped in
> [`CHANGELOG.md`](CHANGELOG.md), and the system map in
> [`ARCHITECTURE.md`](ARCHITECTURE.md). Read this for the _why_ of the
> 2026-08 rebuild and the verified account/deploy facts.

Written 2026-08-06, at the end of the session that finally got the app
deployed.

## The name

The product is **Olvable** as of 2026-08-06. "EventNadu" is dead and must
not appear in anything new. (Spelling confirmed with Shaan as O-L-V-A-B-L-E.)

Renaming is a small, self-contained task and should be its own session or
folded into Phase 1 deliberately, not done piecemeal. Places it appears:

- `app/login/page.tsx` — wordmark, currently `Event` + `Nadu` split spans
- `app/layout.tsx` — page title / metadata
- `components/brand-mark.tsx` — the vector mark (Shaan has still never
  said whether the rebuilt mark lands; confirm before building assets on it)
- `README.md`, and the tagline "Everything happening. One place."
- Vercel project is still named `kairoevents`; the URL
  `kairoevents-beta.vercel.app` therefore does not match the brand. A
  rename or a real domain is a decision for Shaan, not a code change.

## The decision

Keep the repo and the whole delivery pipeline. Rebuild the application
code on top of it, reusing the parts that are proven.

The repo was never the problem. The deploy pipeline works: push -> build
-> live succeeded four times in a row on 2026-08-05. What was broken was
a Vercel project sitting on a team whose GitHub identity could not see
the repo, and that is fixed and cannot recur.

## Verified state (do not re-derive this)

- Repo: `github.com/ShaanGS/chennai-events`, branch `main`
- Vercel: project `kairoevents`, team `shaangurushankar-3291's projects`
  (personal, Hobby, free). NOT the MG WEB team -- that account cannot see
  this repo and never will.
- Live: **https://kairoevents-beta.vercel.app**
  (`kairoevents.vercel.app` is a dead MG WEB deployment. Not ours.)
- Supabase: `gxxhjmwgxmjhmhtnipua`, ap-south-1, free.
  Never touch `axthzhieihoulmktpqdq` -- different account, live CMS.
- Auth: email + password. Magic links were removed: Supabase free SMTP
  allows ~1 mail/minute, so every second click 429'd and the user saw
  "could not send the link" while the first mail had actually been sent.
- Accounts are created only by `npm run user:create -- <email> <password>`
  (admin API, `email_confirm`, no mail sent). There is no signup page.
  Re-running resets a password; that is the only recovery path today.
- GitHub Actions: ingest daily 01:30 UTC, healthcheck 3x/day. Both green.
- Security headers live: CSP `frame-ancestors 'none'`, X-Frame-Options,
  nosniff, Referrer-Policy, Permissions-Policy. HSTS from Vercel.

## Keep. Do not rewrite these.

These are load-bearing and were expensive to get right:

- `lib/connectors/*` — AllEvents and Luma work. Luma is the awkward one:
  ICS needs the internal `cal-XXXX` id resolved from page HTML first, and
  image/venue/country come from a JSON-LD enrichment pass.
- `lib/pipeline/*` — normalisation, quality gates, dedupe (title_norm +
  calendar day), relevance scoring.
- `config/sources.ts`, `config/luma-calendars.ts` (38 verified calendars),
  `config/interest-profile.ts`.
- `scripts/*` — ingest, score, seed, healthcheck, create-user.
- `.github/workflows/*` — and remember: declaring ANY `permissions:` key
  drops all the others. That cost days once already.
- Scoring: Gemini `gemini-3.5-flash-lite` primary, Groq failover, cached
  by content hash. Rubric v3, floor 40.

## Rebuild

The app layer only: routes, data access, components. Aim for a shape that
supports roles and an admin surface from the start, rather than bolting
them on.

## Phase 1 — Admin and access control (shipped 2026-08-23)

The goal in Shaan's words: _only I should have the power to share access_,
and adding a friend must never require a terminal.

Decisions, as built and verified against the live auth server:

1. **Roles** live in `app_metadata.role` (`admin` | `member`) on the
   Supabase user. Not user-writable, returned on every verified
   `getUser()`, no join. No profiles table. Helpers: `lib/auth/roles.ts`.
2. **`/admin`** ("Access" in the sidebar, admin only). Gate is
   `requireAdmin()` in `lib/auth/server.ts`, called by the page and by
   every action in `app/admin/actions.ts`. The middleware also bounces
   members off `/admin`, and the sidebar hides the link -- both cosmetic.
   Create, reset password, revoke, restore, list, audit trail.
3. **Revoke = ban** (`ban_duration: '876600h'`), not delete. Verified:
   `getUser()` on a banned user's existing token fails with "User is
   banned", and the middleware calls `getUser()` per request, so lockout
   is immediate. Reversible ("Restore"); saves are kept. Admins cannot be
   revoked from the UI; the admin cannot revoke themself.
4. **Audit**: `access_audit` (migration 0008). Every create / reset /
   revoke / restore / grant / self password change writes a row.
5. **First admin** by `npm run admin:grant -- <email>`. There is no
   "make admin" in the UI on purpose. Granted: shaangurushankar@gmail.com.
6. **Passwords**: the admin sets them (typed or generated, 16 chars, no
   ambiguous glyphs). Shown exactly once, with a copy button. The new
   user carries `app_metadata.must_change_password = true`; the
   middleware routes them to `/settings?first=1` until they choose their
   own. `/settings` is the change-password screen (replaces the "soon").

Found by running it, not by reading it:

- The auth server **merges** `app_metadata` on update. Omitting a key
  does not remove it; write `false` (or `null`) explicitly.
- Relative times ("signed in 5 seconds ago") must be formatted on the
  server and passed as strings, or hydration mismatches.
- `scripts/create-user.ts` still works and still resets passwords, but
  it does not set the first-login flag. Prefer `/admin`.

## Known gaps, in priority order

1. ~~**Full event descriptions are republished** on the detail page.~~
   **Closed 2026-08-23 (2c.4):** the detail page shows a ≤280-char
   labelled excerpt (`snippet()` in `lib/text.ts`) and links out. Ingest
   had already capped stored descriptions at 400 chars.
2. No password reset (by design — reset needs email). Admin resets only.
3. No login rate limiting of our own; Supabase throttles server-side.
4. No full CSP. Only `frame-ancestors`. A strict `script-src` needs
   per-request nonces.
5. ~~`BROWSER_UA` in `config/sources.ts` impersonates a browser for
   ConferenceAlerts, which 403s honest agents. Source is disabled. Delete
   the path rather than leave it loaded.~~ Done 2026-08-24 (3.10): source
   entry, `BROWSER_UA`, the fetcher's 403 fallback and the DB row are gone.
6. robots.txt compliance is checked by hand in comments, not at runtime.
7. `SUPABASE_DB_URL` is empty in `.env.local` — migrations and pg_dump
   backups will fail until restored.
8. Scoring never records whether a score came from `keywordPass` or the
   LLM (`scoring_model` is stamped uniformly), so the value of the model
   cannot currently be measured.
9. Not built: pagination / all-events, Sources, Interests — the sidebar
   advertises these as "soon". (Settings exists now: change password.)
10. ~~`invited_emails` is now unused. Dropping it is a separate decision.~~
    Dropped 2026-08-24 (3.10, migration 0012).
11. `shaanvishy@gmail.com` exists as a member and has signed in. If it is
    Shaan's own second account, grant it with `npm run admin:grant`.
12. Phone layout of `/admin` was not eyeballed this session (Tailwind
    responsive classes only). Check on a real phone before handing a
    password to anyone from one.

## Working agreement

Agreed 2026-08-06, after a session that sprawled:

- **Plan before code.** Write the plan, agree it, then implement.
- **One feature per session.** Do not mix infrastructure and features.
- **Verify against the live system**, never assume. Nearly every bug in
  this project was found by running something, not by reading code.
- **State facts, not hopes.** "It is live" only after the headers or the
  logs say so.

## Environment gotchas

- PowerShell-first machine. `npx` is blocked by execution policy; use
  `npx.cmd`. Bash one-liners with grep/cut on `.env` files are unreliable.
- Claude's shell is sandboxed and shadows `%APPDATA%`, so it cannot see
  the user's real Vercel CLI login. Vercel account actions must be run by
  Shaan in his own terminal.
- `server-only` cannot be imported by tsx scripts.
- tsx compiles scripts to CJS: **no top-level await**. Wrap in `main()`.
- Every script must `import './load-env'` or env vars are missing.
