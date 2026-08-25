# 007 — Descriptions are excerpts with a link out, never full prose

Settled 2026-08-23 (2c.4), closing REBUILD-PLAN gap 1.

**Decision.** No surface republishes a source's full event description.
Ingest caps stored descriptions at 400 characters; every page shows a
≤280-character sentence-aware excerpt (`snippet()` in `lib/text.ts`,
tested), explicitly labelled as an excerpt, with "Read the full listing
on {source}" linking out. The same rule binds `.ics` exports (DESCRIPTION
= excerpt + URL) and the public page.

**Why.** The descriptions are the sources' copyrighted prose. An
aggregator that quotes and links is a referrer; one that republishes
whole listings is a scraper in the bad sense. The excerpt is also the
honest UI: the source page is where registration actually happens.

**What it is not.** Not a rendering choice per page — a new surface that
shows description text must go through `snippet()`, not slice the stored
field.
