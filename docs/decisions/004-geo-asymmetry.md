# 004 — Geo: local sources keep-unless-elsewhere; national sources prove-local

Settled 2026-08-23 (roadmap 3.7), refining the original classifier.

**Decision.** `classifyGeo` runs two regimes, chosen by the source:

- **Local sources** (AllEvents Chennai, Luma calendars): keep a listing
  unless it positively matches an out-of-scope place. The `OUT_OF_SCOPE`
  list is what makes filtering a fact rather than a guess.
- **National sources** (`kind: 'deadlines'` — Devpost, Unstop, Devfolio):
  an in-person listing must _prove_ it is local (`requireLocal`) — no
  positive Tamil Nadu signal means `filtered_geo`. Online listings skip
  this path entirely.

The product rule, in Shaan's words: **in person ⇒ Tamil Nadu; online ⇒
anywhere, if it is technical.**

**Why the asymmetry.** The inherited default (keep unless positively
elsewhere) is right for a Chennai listing site and wrong for Unstop,
whose venue field is the organising college's own name — no keyword list
will ever contain every campus town in India. Conversely, requiring
positive proof from a Chennai source dropped a real hackathon at
"Freshworks", a venue string with no geographic signal at all.

**Leaks found by verifying, both closed.** Under `requireLocal` the
description must not be read ("register online" kept an IIT Kharagpur
event), and the online test reads city and venue only, never the title
("… (Online + Offline)" kept one at Greater Noida).

**Operational consequence.** Ingest re-stamps status only for rows a run
re-fetched, and runs cap at 400 listings while Unstop publishes ~500 —
so a rule change needs `npm run reclassify -- <source>` to reach rows
the next run will not touch. It only ever moves rows between `active`
and `filtered_geo`.
