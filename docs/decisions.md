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
