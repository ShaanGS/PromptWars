# Guild — task list (observable done-conditions)

Cut order if time runs out (never cut T0–T8; keep T11b's listing — events are the
novelty wedge): T10 people-recs → T11 gap feed → Guild Score breakdown page → T12
onboarding → /events/post form.

- [x] **T0 Workspace** — home .git removed; repo scaffolded; git author = Shaan.
      Done when: remote = ShaanGS/PromptWars and a test push lands authored by ShaanGS.
      (Blocked on Shaan running `gh auth login` — everything else proceeds locally.)
- [x] **T1 Docs** — CLAUDE.md, SPEC.md, tasks.md, docs/ committed.
- [x] **T2 Scaffold** — Next 16 + TS strict + Tailwind 4 + shadcn (14 components,
      default styling). First Vercel deploy pending GitHub↔Vercel link.
- [x] **T3 Engine + tests** — 17 tests green in 707ms, all invariants proven.
- [x] **T4 Supabase** — 8 tables + RLS live; 40 profiles / 75 skills / 26 events /
      4 projects seeded; anon UPDATE on seed rows = 0 rows (verified via REST).
- [x] **T4b Events ingest** — 25 real events fetched live from Devfolio (10),
      Devpost (10), Unstop (5) via ported chennai-events connectors + SIH seed row.
- [x] **T5 Plumbing + demo auth** — /demo route works; DEMO_MODE=static wired.
      NOTE: anonymous sign-in DISABLED on Supabase — Shaan must enable it
      (Dashboard → Authentication → Sign In/Up → Anonymous). Demo reads work
      signed-out meanwhile.
- [x] **T6 Design system** — Linear design.md tokens mapped onto shadcn CSS vars;
      Inter + Geist Mono; motion tokens from Emil's skills (no GSAP — CSS only).
- [x] **T7 Sandbox** — verified in browser: 3 empty slots pulsing, gap-filler +7.8%
      vs duplicate +1.5%, instant recompute, removal re-lights slots.
- [x] **T8 Auto-Draft** — 450ms staggered picks, score climbed 62→80% on screen.
- [x] **T9 Risk report** — Team X-ray panel live (bus factor, dead zone, commitment).
- [ ] **T10 Profiles** — /p/[handle]: Guild Score breakdown + top-3 complements with
      reason lines.
- [ ] **T11 Projects + gap feed** — /projects/new builder (with event selector) → working
      sandbox; rare skill added → feed reorders.
- [ ] **T11b Events section** — /events listing (sources labeled, deadline-sorted);
      event page shows squads + "create squad request" → sandbox; organiser post appears
      with attribution; ingested rows not editable (RLS check).
- [ ] **T12 Onboarding** — fresh email signup → appears in flagship candidate ranking.
- [ ] **T13 Persist rosters** — reload keeps roster; second account mutation fails.
- [ ] **T15 Landing** — refs-styled, "Guild @ SRM", demo → sandbox < 5 s.
- [ ] **T16 Security + QA sweep** — advisors 0 criticals; RLS matrix retested; final
      deploy; README.
