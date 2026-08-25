# 009 — Config lives in git; the DB is the runtime copy

Settled 2026-08-05 with the pipeline.

**Decision.** The source registry (`config/sources.ts`), Luma calendar
list and interest profile are checked into git and pushed outward into
the database by `npm run seed`. The DB row is what the running system
reads and can be tweaked without a deploy; re-running the seed resets it
to what the repo says.

**Why one direction.** Two writable copies with no owner drift until
neither is trusted. Git owning config means every change is reviewed,
dated and revertible, and a runtime tweak is explicitly temporary.

**Split of responsibility** (stated in `config/sources.ts` so it never
becomes a question): CODE owns structural facts (how to fetch, how to
parse, whether the LLM is needed); CONFIG owns operational defaults
(enabled, crawl delay, user agent, audience); the DB row is the runtime
value.

**Corollary.** The seed runs at the top of every ingest workflow, so a
config change ships by push alone — and a DB-side tweak survives at most
until the next morning's run.
