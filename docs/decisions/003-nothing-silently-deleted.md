# 003 — The pipeline never silently deletes

Settled 2026-08-05, held ever since.

**Decision.** Nothing in the pipeline discards data invisibly. Raw
payloads are persisted to `raw_listings` unconditionally; an out-of-area
event gets `status = 'filtered_geo'` and a gate failure gets
`filtered_quality` — both stay in the table.

**Why.** Silent discarding is the failure mode that sends someone back
to checking Luma by hand: an event that never appears is
indistinguishable from an event that was never seen. Keeping filtered
rows lets the UI prove the negative ("Filtered out (N)").

**The gates exist for the failure that actually happens.** Not a scraper
returning zero rows — a changed selector returning forty rows with empty
titles and no dates, which passes a count check and quietly poisons the
dashboard. So the gates check title ratios, date ratios, volume against
the trailing median, and churn; a human can wave exactly one run's
volume check through (`allowVolumeChange`) and nothing else.
