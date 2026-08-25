Seed-time event ingest: pulls upcoming hackathon/competition listings from the public Devfolio, Devpost, and Unstop APIs into `events.json`.
Run with `node ingest/fetch-events.mjs` (Node 18+, no dependencies).
This runs at seed time only — it is not part of the app's runtime or build.
