# Session handoff log

Newest at top.

## 2026-08-25 · S7 — documentation made true

The code shipped in S6; the docs did not follow it. Every prose file in the
repo still described Olvable-the-event-aggregator, which is what a judge opening
the repo cold would have read first.

Rewritten around Guild and PS-2: `README.md` (thesis, formula, the
statement→model mapping, a 60-second walkthrough whose numbers are **computed
through the engine from the seed data**, not asserted), plus `CLAUDE.md`,
`AGENTS.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`,
`decisions.md`. Added `SECURITY.md`. `package.json` name → `guild`.

Three things worth carrying forward, found while checking claims rather than
copying them:

- **`requireAdmin()` does not check anything.** It returns the stand-in user
  unconditionally, so `/admin`, `/design` and seven admin server actions are
  open — contradicting `lib/auth/roles.ts`, S6's entry below, and the posture
  the README states. Documented as a known gap in `SECURITY.md` rather than
  written around, and now roadmap item 1. Only `/admin/add` and
  `/admin/discovery` gate correctly, via their own `roleOf` check.
- **`supabase/guild/*.sql` does not describe the deployed database.**
  `0002_rls.sql` shows ownership-scoped policies that are not applied (the live
  tables are open), and `0001_schema.sql` declares its own `public.events` that
  collides with Olvable's, so it cannot be run on top of the migrations. A
  security reviewer reading those files alone would conclude the opposite of the
  truth. Stated in `SECURITY.md` and `ARCHITECTURE.md`.
- **`.env.example` is not in the repo.** `.gitignore` puts `!.env.example`
  before the broader `.env*` rule, so the negation loses and a cloner never
  receives it. Docs that said "copy `.env.example`" were wrong; they now name
  the two variables directly. Fixing the `.gitignore` ordering is still open.

Also corrected: S6 below recorded a `nudges` table. No such table is created,
read or written anywhere in the repo.

## 2026-08-25 · S6 (Fable) — Guild merged INTO Olvable

The repo is no longer "Guild with an Olvable-ish skin". It **is** Olvable
(cloned from ShaanGS/chennai-events at its current main), with Guild's
team-formation grafted in. Olvable's shell, design system, components, event
corpus and ingestion are untouched and are the app.

### What was added
- `lib/engine/` — Guild's pure-TS scoring engine, moved over intact. Zero
  imports, 17 unit tests. Not wired to any framework.
- `/teams` — Team Board. Squads ranked by `gapFeed`, i.e. by what the viewer
  would add, not by keyword match. `components/team/squad-card.tsx` is built
  on the same skeleton as `components/event-card.tsx`.
- `/squad/[id]` — the sandbox. Open slots pulse, candidates are ranked by
  marginal gain with "fills X" / "already covered by Y" chips, Auto-draft
  narrates the greedy pick one every 420ms, Team X-ray lists structural risks.
- `/people` and `/p/[handle]` — the pool ranked by Guild Score, and the
  profile with score breakdown, complementarity matches and the gap feed.
- Nav: Team Board and People added to `NAV_PRIMARY`; Team Board takes a phone
  tab, Calendar moves to sidebar-only.

### Auth
Removed, because judges must not hit a login. `middleware.ts` is a
pass-through and `lib/auth/server.ts` returns one stand-in user so the twenty
call sites keep working.

**That user is a `member`, not an admin.** A subagent originally hardcoded
`isAdmin() -> true`, which would have handed every anonymous visitor the
corpus-editing and access-control screens. That is a different decision from
"skip the login" and was not asked for, so it was reverted:
`lib/auth/roles.ts` now defers to `roleOf`, and `/admin/*` is meant to stay
closed. Restoring real auth is a `git revert` of the two auth files plus
middleware. (**Correction, S7:** `requireAdmin()` was left unchecked, so that
intent is not actually enforced on `/admin`, `/design` or the admin server
actions. See `SECURITY.md`.)

### Database
Supabase project `guild` (`fjxgqiveolnnrslihodl`, ap-south-1) was reset with
Shaan's approval and now carries Olvable's schema plus Guild's tables:
`profiles, skills, projects, requirements, memberships`.
`projects.event_id` -> Olvable's `events.id`, so a squad forms around a real
ingested listing.

Seeded by `node seed/seed-demo.mjs` (idempotent): 25 real hackathons from the
Devfolio/Devpost/Unstop ingest, 40 SRM profiles with deliberate duplicate-skill
clusters, 5 squads. React is over-supplied and figma/pitching are scarce on
purpose — that is what makes the diminishing-returns maths visible on screen.

GOTCHA: this build has **no service-role key**. It runs on the publishable key
and the demo tables are deliberately open (`demo_all` policies). That is safe
only because the database is a throwaway holding generated data. Do not point
this build at Olvable's production database — it has 1,328 real events and
real user rows, and the open policies would apply there too.

### Not done
Nudges, Idea Board, Communities and Notifications are unbuilt — Guild can
identify the right teammate but cannot let you contact them, which is the
largest genuine gap. `/teams/new` is linked twice from the Team Board and does
not exist. `explainScore` is exported with no callers.

## Related, but not this build's plan: `docs/target-product.md`
An earlier Guild prototype Shaan made in **Lovable** — a different app and a
different design system — transcribed screen by screen. It is a useful feature
backlog (Nudges especially) and nothing more; its paths, colours and fonts do
not describe this repo, and it now carries a banner saying so. Do not follow it
as a spec.
