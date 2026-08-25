# 002 — Ingestion runs on GitHub Actions, not Vercel

Settled 2026-08-05.

**Decision.** Scraping and scoring run in `.github/workflows/ingest.yml`
(daily 01:30 UTC = 07:00 IST), never in Vercel functions or Vercel Cron.

**Why.** Vercel Hobby caps functions at 300 seconds. AllEvents alone
cannot finish inside that at a 10-second crawl delay, and the scoring
pass needs minutes more. Actions also gives retries, schedule precision
and 90 days of logs instead of one hour.

**The shape that follows.**

- The ingest loop runs per source, so one broken connector cannot stop
  the others.
- `healthcheck.yml` runs 3×/day and does two jobs: a keep-alive query
  (Supabase free projects pause after 7 days of low activity — three of
  Shaan's other projects already have) and a loud failure when an
  enabled source has no successful run in 48 hours.
- Workflow gotcha that cost days: declaring ANY `permissions:` key in a
  workflow drops every permission not listed — `contents: read` must be
  restated or checkout fails.
