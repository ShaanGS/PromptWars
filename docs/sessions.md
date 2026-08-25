# Session handoff log

Newest at top.

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
`lib/auth/roles.ts` now defers to `roleOf`, and `/admin/*` stays closed.
Restoring real auth is a `git revert` of the two auth files plus middleware.

### Database
Supabase project `guild` (`fjxgqiveolnnrslihodl`, ap-south-1) was reset with
Shaan's approval and now carries Olvable's schema plus Guild's tables:
`profiles, skills, projects, requirements, memberships, nudges`.
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
`docs/target-product.md` still lists the Lovable feature set. Nudges has a
table but no UI. Idea Board, Communities and Notifications are unbuilt.

## READ ALSO: `docs/target-product.md`
The Lovable build transcribed screen by screen — onboarding wizard, Nudges,
Team Board, Idea Board, Communities, Home rail — with a build order.
