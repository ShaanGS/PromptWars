# Guild — product spec

## Thesis

Everyone else builds people-search with skill filters. Guild is a **team composition
engine**: it scores *teams against project requirements*, not people against people.
A second person with the same skill produces diminishing returns; the person who fills
your gap does not. The primary object on screen is a **GAP**, not a person card.

Guild is also a complementarity network: LinkedIn recommends people *similar* to you,
Guild recommends people who *complete* you.

**Positioning:** Guild @ SRM. v1 pool is SRM students/depts; the communities table is
the seam for scaling to other campuses later.

## Use-cases

Hackathon squads (primary; tied to real events), research collaborations, startups,
course projects — all are just requirements with different skill tags.

## The flow

1. `/events` — real competitions ingested from Devfolio/Devpost/Unstop (seed-time
   script, ported from ShaanGS/chennai-events) + organiser-posted events.
2. Open an event → see squads forming → **create a squad request** = a project with
   `event_id` set. The whole engine works on it unchanged.
3. `/projects/[id]` — THE SANDBOX. Left: requirement slots (empty slots are the loudest
   element: pulsing, requirement named inside). Right: candidates ranked by marginal
   gain with "fills X / duplicates Y" chips. Bottom: live coverage bar. Add/remove
   recomputes and animates ≤300 ms (engine runs client-side).
4. Auto-Draft: greedy marginal-gain picks fill slots one by one, staggered.
5. Risk report: bus factor, unmet requirements, availability dead zones, commitment gaps.

## Engine math (deterministic; ties broken by id asc)

- `p_eff = proficiency × (verified ? 1 : 0.6)`; verified ⇔ proof_url present.
- `coverage_r = 1 − Π(1 − p_eff)` over members with `p_eff ≥ min_proficiency` (hard gate).
- `base = Σ(w_r × coverage_r) / Σ(w_r)`.
- `overlap` = weekly minutes in the intersection of ALL members' windows ÷ 600, cap 1;
  team ≤1 ⇒ 1.
- `balance = 1 − variance(experienceLevels)/4`; ≤1 member ⇒ 1.
- `commitment = 1 − (max−min commitmentLevel)/4`; ≤1 member ⇒ 1.
- `score = 0.60·base + 0.15·overlap + 0.15·balance + 0.10·commitment`.
- `marginalGain(c) = score(T∪c) − score(T)` — drives every ranking and explanation.
- **Guild Score** (per person) `= 0.40·credibility + 0.25·versatility + 0.35·scarcity`;
  credibility = verified/total skills; versatility = distinct skills ÷ 8 cap 1;
  scarcity = mean over skills of demand/(demand+supply) across open requirements/pool.
- Risks: bus_factor = requirement with exactly 1 contributor; unmet = coverage < 0.5;
  dead_zone = overlap < 120 min/wk (team ≥ 2); commitment_gap = spread ≥ 3.

## Social layer

- Guild Score with breakdown on `/p/[handle]`.
- "People you should meet" = top pairwise complementarity (who fills what you lack).
- "Teams looking for YOU" on `/projects` = open projects ranked by MY marginal gain.

## Demo mode (judge path — must never break)

Landing → "Explore demo" → `/demo` signs in anonymously → seeded flagship squad request
with zero forms. Team-building on seed projects is **client-side state only** (no DB
writes). `DEMO_MODE=static` serves bundled seed JSON with Supabase fully down.

## Data model

profiles(user_id nullable→seed, handle, name, dept, year, bio, experience_level 1-5,
commitment_level 1-5, availability_windows jsonb, is_seed) · skills(profile_id, skill,
proficiency 0-1, proof_url) · events(source devfolio|devpost|unstop|organiser,
external_url, title, host, mode, dates, deadline_at, tags[], posted_by_profile_id) ·
projects(owner_profile_id, community_id?, event_id? ⇒ squad request, title, …, is_seed) ·
requirements(project_id, skill, role_label, weight, min_proficiency) ·
memberships(project_id, profile_id, status invited|accepted) · communities(slug, name) ·
community_members. RLS: read all; write only your own rows; owner-only project writes;
ingested events immutable via API. Seed rows have user_id NULL ⇒ unclaimable.

## Decisions log

- Requirement = one skill per slot (+ optional role_label for display).
- Membership add = 'accepted' directly (no invite round-trip — notifications excluded).
- "Which slot a member fills" is derived (largest contribution), never manual.
- Event posting open to any signed-in user with attribution; no organiser role in v1.
- v1 ingest sources: Devfolio, Devpost, Unstop.

## Roadmap (post-hackathon, NOT v1)

Endorsement loop (post-project peer reviews feeding credibility), complementarity graph
view, invites/notifications, multi-campus communities, GitHub-derived skill proofs.
