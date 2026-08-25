# Guild

Team formation for SRM. Built at the FAST hackathon (problem statement 2).

Everyone else builds people-search with skill filters. Guild is a **team composition
engine**: it scores whole teams against what a project needs, not people against
people. Coverage is a probabilistic OR — `1 − Π(1 − proficiency)` — so a second
person with the same skill moves you from 80% to 90%, while the person who fills
your gap moves you from zero. The primary object on screen is a gap.

## What's inside

- **The sandbox** (`/projects/[id]`) — open requirement slots pulse; candidates are
  ranked by *marginal gain* to your exact roster; every duplicate is labeled with
  who already covers it.
- **Auto-draft** — greedy engine picks fill the slots one by one.
- **Team X-ray** — bus-factor, availability dead zones, commitment gaps.
- **Guild Score** (`/people`, `/p/[handle]`) — credibility × versatility × scarcity.
- **Complementarity, not similarity** — "people you should meet" are the ones who
  fill what you lack.
- **Real events** (`/events`) — live listings ingested from Devfolio, Devpost, and
  Unstop; a squad request is a project pinned to an event.

## Stack

Next.js 16 (App Router) · TypeScript strict · Supabase (Postgres + RLS + anonymous
auth) · Tailwind 4 + shadcn/ui · Zod · pure-TS engine with vitest tests.

```bash
npm install
npm test        # engine invariants
npm run dev
```

`/demo` drops you into a seeded workspace with zero forms. `DEMO_MODE=static`
serves the same demo from bundled data with no network.

See `CLAUDE.md` (working agreements), `SPEC.md` (product + math), `tasks.md`
(build log), `docs/` (decisions + session handoffs).
