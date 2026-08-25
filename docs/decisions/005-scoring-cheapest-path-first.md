# 005 — Scoring: keyword pass first, LLM for the middle, fit at request time

Settled with the pipeline (2026-08-05), fit layer added 2026-08-23.

**Decision.** Relevance has two layers that multiply, and neither costs
money per user:

1. **Quality** (global, cached): a keyword pass answers the obvious
   cases for free; only the genuinely ambiguous middle goes to an LLM
   (Gemini `gemini-3.5-flash-lite` primary, Groq failover — ONE key
   each; Groq rate-limits per organisation, so extra keys multiply
   nothing and multi-account stacking violates their policy). Scores
   cache by content hash + profile hash + scoring version; `score.ts`
   caps LLM calls per run rather than burning the day's quota.
2. **Fit** (per user, request time): pure TS over the ~60 rows already
   fetched — tags, in-person vs online, weekday vs weekend.
   `rank = quality × (0.7 + 0.3 × fit)`, so a strong event you did not
   ask for still shows, and a weak one you did ask for is not promoted
   past its quality.

**Why.** Free tier as a design constraint: most listings never need a
model (AllEvents Chennai is dominated by concerts, marathons and expos),
and per-user LLM calls would multiply cost by membership. The fit reasons
are returned so a card can say "For you · Startups" instead of being a
black box.

**Calibration facts.** Online penalty 25 (raised from 15 — webinar noise
still crowded the list at 15). Feed floor 40. Of 576 active events at
measurement, 350 scored below the floor — the model's real job is
discarding ~61% of the feed.

**Known gap** (REBUILD-PLAN gap 8): `scoring_model` is stamped uniformly,
so keyword-pass vs LLM provenance cannot be measured yet.
