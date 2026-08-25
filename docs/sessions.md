# Session handoff log

Append ≤10 lines per session: done / decisions / gotchas. Newest at top.

## NEXT SESSION: frontend / design pass only

Backend, data, engine, routing, and security are DONE and verified. The next
session is a **pure design pass** — Shaan supplies a moodboard, Pinterest refs,
generated assets, and the Guild logo file.

**Everything you need to restyle lives in two places:**
- `src/app/globals.css` — every colour, radius, font, and motion token.
  Change tokens here and the whole app follows. Currently Linear-derived.
- `src/components/` — `nav.tsx`, `sandbox/sandbox.tsx`, `onboarding/`,
  `projects/`, plus stock `ui/` (shadcn — keep these stock, theme via tokens).

**Do NOT touch during the reskin:** `src/engine/**`, `src/repo/**`,
`src/actions/**`, `supabase/**`, `src/lib/**`. The pages call them correctly.

**Known layout notes for the redesign:**
- Mobile is verified working (375px, no horizontal overflow) but was never
  *designed* — it is desktop CSS collapsing. Real mobile design is open work.
- On mobile the sandbox stacks score → slots → risks → candidates. Candidates
  arguably belong above risks on a phone; deliberate call left to the redesign.
- Fonts are Inter + Geist Mono as Linear substitutes. Swap in `layout.tsx`
  + the `--font-sans` / `--font-mono` tokens.
- Emil Kowalski's animation skills are vendored in `.claude/skills/` — read
  `animate/SKILL.md` before adding motion. CSS transitions only, ≤300ms,
  `var(--ease-out)`, reduced-motion variants ship with every animation.

**Two manual steps still outstanding (Shaan):**
1. Supabase → Authentication → Sign In/Up → enable **Anonymous** sign-in.
   Without it `/demo` still shows seeded data, but signed-out.
2. Vercel project `guild-app` is Git-connected; confirm the build from `main`
   goes green. An earlier direct file-push deployment errored (incomplete
   payload, not a code fault) — ignore it.

## 2026-08-25 · S1 (Fable) — everything except visual design
- Engine (17 vitest tests green), Supabase schema + RLS + seed, events ingest,
  all routes, server actions, demo mode, Linear token system, mobile nav row.
- Verified in-browser: sandbox recompute (55→62→80%), auto-draft stagger, risk
  panel, events→squad loop, people/profile pages, onboarding form.
- RLS proven by curl: anon writes to seed rows affect 0 rows; reads work.
  Supabase security advisors: 0 findings.
- Removed stray /Users/nandy/.git (pointed at rootbrites/F.A.S.T_Leaderboard).
- create-next-app rejects capital-letter dirs — scaffolded as "guild", rsynced in.
- GSAP dropped in favour of CSS motion per Emil's skills; email auth cut from v1.
