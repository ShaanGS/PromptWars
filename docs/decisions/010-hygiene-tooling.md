# 010 — Prettier + CI as the gate; no pre-commit hook; ADR-lite records

Settled 2026-08-24 (roadmap 4.2 / 4.3 decisions, defaults taken).

**Decision.**

- **Prettier over Biome**, pinned to the style the code already used
  (single quotes, no semicolons, 100 cols). Biome is faster and one
  tool, but it swaps out the ESLint config that already works —
  churn without a defect to point at.
- **CI is the gate, no pre-commit hook.** `ci.yml` runs lint,
  format:check, typecheck, test and build on every push and PR. Hooks
  via husky/lint-staged were declined: hooks on a Windows/OneDrive
  machine have bitten before, and a gate that runs identically for
  every clone beats one that depends on local setup.
- **CI takes no secrets.** The build must succeed without Supabase or
  LLM keys (verified: every route is dynamic); anything needing a
  secret at build time is a bug the workflow exists to catch.
- **Decision log = `docs/decisions/NNN-title.md`** (this format) over
  one long `DECISIONS.md`: one decision per file keeps links precise
  and diffs reviewable; the index in `README.md` is the single screen.
- **Migrations are prettier-ignored** — never rewritten once applied.

**Why record tooling at all.** These are the decisions most likely to be
re-litigated by a new contributor ("why not Biome?", "add husky?"), and
the cheapest to answer with a dated reason.
