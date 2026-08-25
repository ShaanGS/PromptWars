# 011 — High-volume sources are feed-opt-in, not feed-default

Settled 2026-08-24, with the Knowafest go. Shaan's call: "instead of
injecting it into the feed, add a filter or option."

## Constraint

The feed is the daily triage surface — worth opening only while it stays
a shortlist. Knowafest lands ~110 college fests per sweep and 57 of the
first batch scored above the relevance floor: a legitimate source whose
sheer volume would bury the ten listings the feed exists to surface. The
scorer alone cannot fix this, because most fests are genuinely in scope.

## Decision

A source can be marked `feedOptIn: true` in `config/sources.ts`. Its
events join the feed — list, counts, closing-soon, the unseen badge —
only when its chip is the active source filter (`feedSourceIds()` in
`lib/sources.ts`). Everywhere else it is an ordinary enabled source:
All events, the calendar, search, Saved. Nothing is hidden, muted or
deleted; the default view is just a shortlist.

This is the softer sibling of decision 006: deadline sources get a
separate surface because their shape is different; opt-in sources stay
on the same surface because their shape is fine — only their volume
is not.

## The failure it prevents

Enabling a high-volume source silently turns the feed from "ten things
worth a look" into "a hundred campus fests" overnight, and the feed
stops being opened — the ConferenceAlerts-era failure mode, reached
from the opposite direction.
