# 008 — The public surface is one page per event

Settled 2026-08-24 (roadmap 3.9).

**Decision.** Exactly one route is public: `/e/:id` (plus its `.ics`).
It serves only `status = 'active'` rows from enabled sources — stricter
than the member page — and carries no relevance score, band, fit pill or
"why it's ranked here": those say things about the member, not the
event. `robots.ts` allows `/e/` and disallows everything else. No public
feed, search or calendar — one event by direct link is the growth loop;
more would be a different product decision.

**Why.** Everything else is behind login, and the first thing a member
does with a good event is share it with a non-member — who, before this,
landed on a login screen. The unfurl (OG title, date/venue description,
banner image) is most of the value: the link has to look like the event
in WhatsApp, not like a sign-in wall.

**Found on the way, structural.** `app/loading.tsx` wrapped every route,
so the shell streamed a 200 before a page could 404 — for curl AND for
the WhatsApp/Twitter/Facebook unfurlers. A filtered or bogus `/e/` link
would have been indexed as a 200. Fix: member routes moved into the
`(app)` route group (URLs unchanged), public routes stay outside it, and
`getPublicEvent` is checked in `generateMetadata`, which runs before the
first byte. This is why the route-group split exists; do not flatten it.

**Bottom of the page:** a one-line invite + Sign in, not a
"request access" form — there is no self-serve sign-up, so a form would
be a promise we can't keep. It becomes real when email exists (001).
