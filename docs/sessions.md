# Session handoff log

Append ≤10 lines per session: done / decisions / gotchas. Newest at top.

## 2026-08-25 · S4 (Fable) — Olvable components ported

Shaan's verdict on S3: still not usable, "I want it exactly like olvable and
you have the code". So the actual components are now ported, not approximated.

- `src/components/ui/bits.tsx` — direct port of Olvable's `components/ui/bits.tsx`:
  `toneClass` pastel map, `Pill`, `Avatar` (size in px, tone from name length),
  `StatTile` (pastel tile, 13px label + 30px figure — the AETHER stat card),
  `DataRow`, `EmptyState`. Plus `ScoreBand` + `coverageBand`, which are the
  feed's "Worth it 75" badge applied to squad coverage.
- `src/components/squad-card.tsx` — Guild's version of Olvable's `EventCard`:
  same skeleton (`flex h-full flex-col overflow-hidden rounded-xl border
  bg-card shadow-card`, border turns accent on state), one title, one meta
  line, a few pills, then an ACTION ROW. The action row is the usability fix
  that was missing: state on the left, one ink button on the right.
- Sidebar now matches Olvable exactly: active item is `bg-surface-2
  text-foreground` (NOT black — that was the AETHER read, Olvable is lighter),
  grouped nav with a SETUP heading, user block pinned at the bottom.
- Events list cards got the same action row (`See squads` / `Start a squad`
  in ink, external link demoted to an icon button).

WHEN CONTINUING: read Olvable's real components before inventing anything —
`gh api repos/ShaanGS/chennai-events/contents/components/<file> --jq '.content'
| base64 -d`. Useful ones not yet ported: `card-actions.tsx` (the Going /
save / skip row), `feed/`, `filter-bar.tsx`, `shell/mobile.tsx`,
`components/ui/pill.tsx`.

## 2026-08-25 · S3 (Fable) — design tokens corrected to Olvable

THE DESIGN SYSTEM IS NOW A PORT OF SHAAN'S OWN `ShaanGS/chennai-events`
(Olvable) SYSTEM. Do not reinvent it. Its rules, which we now follow:
- Inter 400/500/600 ONLY. A neutral grotesque is what makes the app read as
  one system rather than as a "designed" page. No Poppins, no ExtraBold.
- The primary control colour is INK (#12131a) — black buttons, black active
  nav. Indigo (#5b5bd6) is the ONE accent and is reserved for meaning
  (marginal-gain deltas, open slots, score bars), never for furniture.
- Borders do the work of elevation. Shadows are near-zero
  (`0 1px 2px rgb(18 19 26 / 0.04)`). No big soft drop shadows.
- Radius: controls 12px, cards 16px, panels 20px. NOT pill — pills are only
  for small chips and avatars.
- Categorical pastels (sky/mint/lemon/rose/lilac/peach) each pair with the
  dark stop of their own hue; text on a pastel is never plain black.
- Canvas #f5f6fa, surface #fff, line #e2e4ec, ink scale 12131a/6b7080/9a9fb2.
Reference dashboard for layout density and spacing: the AETHER screenshot in
the chat (sidebar + main + right rail, pastel stat cards, black active pill).
The logo is used AS SUPPLIED — `public/brand/guild-{logo,mark}.png`, white
artwork inside an ink tile. Do not redraw or recolour it.
`/onboarding` is now a real nav item ("Your profile") in both navs.

## 2026-08-25 · S2 (Fable) — first design pass (SUPERSEDED by S3)
- Replaced the dark Linear theme with the moodboard system: light lavender
  canvas, single purple accent, pill controls, soft rounded cards, Poppins.
- `AppShell` = desktop sidebar rail + mobile bottom tab bar; `Page`/`PageHead`
  frame every screen. Old `nav.tsx` deleted.
- Guild mark redrawn as SVG (`components/brand.tsx`) with deterministic avatar
  tints. Landing rebuilt around the orbit hero. New `/home` feed.
- Verified in-browser at 375px and 1100px: no overflow, auto-draft 55%→80%,
  every page renders. 17 engine tests green, tsc clean.
- GOTCHA: Tailwind 4 cannot `@apply` a class defined in `@layer components`
  (e.g. `@apply g-card`) — duplicate the declarations instead.
- STILL OPEN: enable Anonymous sign-in in the Supabase dashboard.

## Earlier plan for this session (kept for reference)

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
