# 006 — Deadline sources are a separate surface, keyed on the cutoff

Settled 2026-08-23 (roadmap 3.6).

**Decision.** Sources whose listings are entered-before-a-cutoff rather
than attended-at-a-time carry `kind: 'deadlines'` in `config/sources.ts`
(Devpost, Unstop, Devfolio). Their rows live on `/hackathons`, ordered by
`registration_deadline`, and are excluded from the feed, All events and
the calendar's Everything scope. **Never** excluded from Saved / Mine /
the detail page — anything you save keeps working everywhere.

**Why the separate surface.** Every list surface filters
`starts_at >= now`, and a deadline listing that is open RIGHT NOW has a
start in the past (Devpost maps the submission window's opening; Unstop
maps only the cutoff). The events most worth showing are exactly the
ones a start-time filter drops. And they are national and mostly online,
so merging them would swamp the feed, which is the local triage surface.

**Why a `kind` field, not an id list.** Source #11 of the same shape
must need no query change — the queries read the structural fact, not a
hard-coded list.

**Found live, all fixed the same day.** `source_health()` counted only
future starts, so a healthy Devpost reported "0 open" and read as broken
(migration 0011 counts either a future start or a future close). Cards,
Saved and the calendar each hit the start-vs-cutoff bug independently —
`effectiveInstant` / `effectiveLocal` in `lib/events.ts` is the one
answer, and `getCalendarEvents` ranges _mine_ in TS because SQL cannot
see the cutoff. Quizzes are dropped at the Unstop connector: an online
aptitude test is not something you go to or build at.

**Devfolio nuance.** It returns a real start AND a cutoff, so its rows
are ordinary events that happen to carry a deadline — no rewriting
needed; it is the best-shaped source of the three.
