# Decisions (ADR-lite)

- **Engine is pure TS with zero imports** — runs identically in browser (sandbox,
  ≤300 ms recompute without a server round-trip) and server; unit-testable in ms;
  enables the DEMO_MODE=static fallback.
- **Requirement = one skill** (+ display label), not a role→skills bundle: transparent
  math, explainable to judges.
- **Demo team-building is client-side only on seed projects** — resolves the RLS
  contradiction (anon users must never mutate seed rows) and survives Supabase outages.
- **Events ingested at seed time, never at runtime** — connectors ported from Shaan's
  chennai-events repo; app stays fast and scrape-fragility stays out of the demo path.
- **Squad request = project with event_id** — the whole engine works on events for free.
- **Seed rows have user_id NULL** — unclaimable/unmutable under RLS by construction.
- **Design source = Linear design.md (getdesign.md format)** supplied by Shaan:
  canvas #010102, lavender #5e6ad2 as the only accent, surface ladder, hairlines,
  Inter (closest substitute for Linear's custom sans). Mapped onto shadcn's CSS
  variables — component files stay stock.
- **GSAP dropped** — Emil Kowalski's animation skills (in .claude/skills/) govern
  motion: cheapest tool that works ⇒ CSS transitions/animations only, strong
  ease-out curve, ≤300ms UI durations, reduced-motion variants.
- **Email/password auth cut from v1** — no SMTP in scope; anonymous sessions +
  onboarding cover the full flow. Real auth is a roadmap item.
- **Supabase publishable key + URL committed in code as fallback** — publishable
  by design (ships in every client bundle); RLS is the security boundary.
