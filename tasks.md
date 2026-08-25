# Guild — task list (observable done-conditions)

Cut order if time runs out (never cut T0–T8; keep T11b's listing — events are the
novelty wedge): T10 people-recs → T11 gap feed → Guild Score breakdown page → T12
onboarding → /events/post form.

- [x] **T0 Workspace** — home .git removed; repo scaffolded; git author = Shaan.
      Done when: remote = ShaanGS/PromptWars and a test push lands authored by ShaanGS.
      (Blocked on Shaan running `gh auth login` — everything else proceeds locally.)
- [x] **T1 Docs** — CLAUDE.md, SPEC.md, tasks.md, docs/ committed.
- [ ] **T2 Scaffold + first deploy** — bare landing + "Explore demo" stub live on Vercel.
- [ ] **T3 Engine + tests** — npm test green: coverage(0.8,0.5)=0.9; duplicate 0.8 React
      → 0.96 and ranks below gap-filler; autoDraft deterministic; bus_factor flagged.
- [ ] **T4 Supabase** — 8 tables live; 40 seeded SRM profiles with duplicate-skill
      clusters; anon UPDATE on seed profile = 0 rows.
- [ ] **T4b Events ingest** — ≥10 real hackathons in events with working links; running
      twice adds no duplicates. Fallback (20-min timebox): hand-seed 10 real events.
- [ ] **T5 Plumbing + demo auth** — incognito /demo → flagship project with data dump;
      DEMO_MODE=static renders same with Supabase unreachable.
- [ ] **DEPLOY CHECKPOINT A** — refs tripwire 11:55: no refs ⇒ neutral logo tokens.
- [ ] **T6 Design system** — /style-guide matches Pinterest refs (tokens, fonts).
- [ ] **T7 Sandbox** — 5 slots (3 empty, pulsing); gap-filler shows big delta, duplicate
      small; removing sole contributor re-lights its slot; recompute ≤300 ms.
- [ ] **T8 Auto-Draft** — slots fill sequentially; final score equals test fixture.
- [ ] **T9 Risk report** — crafted roster shows bus_factor + dead_zone; removing sole
      designer adds a flag within one beat.
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
