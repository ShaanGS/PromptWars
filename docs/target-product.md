# Parked direction — the Lovable prototype

> **This is not the plan for this build, and it does not describe this
> codebase.** It is a transcription of an earlier Guild prototype Shaan made in
> Lovable — a different app, a different design system, a different repo.
>
> It is kept for one reason: it is a genuine, screen-by-screen feature backlog,
> and section 2 (Nudges) names the one capability this build really is missing.
> Read it as *ideas that were considered*, never as a description of what
> exists here or a source of paths, colours or fonts.
>
> **Everything in the "Design system" section below is wrong for this repo** —
> corrected in place, 2026-08-25. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for
> what is actually here.
>
> Where it argues this repo is "just a team scoring tool", disagree with it:
> scoring whole teams against project requirements is precisely what Problem
> Statement 2 asks for, and it is this submission's thesis. The features below
> are adjacent, not corrective.

---

## Navigation

**In the Lovable prototype:** a dark sidebar with an emerald active state and a
left border: `Home · Discover · Team Board · Idea Board · Communities ·
Notifications · Nudges · My Profile`, then `Settings` and a user block pinned to
the bottom.

**In this repo** (`components/shell/nav.ts`): `Feed · All events · Hackathons ·
Team Board · People · Calendar · Saved`, then a setup group (`Sources ·
Interests · Settings`) and an admin group. Team Board, Feed and Saved take the
phone tabs; the "You" tab is `/settings`. Routes are `/teams` and `/squad/[id]`
— there is no route called "Squads".

Not built here: Discover, Idea Board, Communities, Notifications, Nudges.

---

## 1. Onboarding — a 6-step wizard (currently one long form)

Progress bar across the top, `Step N of 6`, dot indicators, Back / Next.

1. **Who are you?** — "Let's start with the basics."
   Full name · Department (select) · Year of study (1st/2nd/3rd/4th as buttons,
   not a dropdown) · Registration number (optional, "Adds trust to your profile")
2. **Skills** — the skill claims step.
3. **What are you into?** — "Pick your interest areas and what you're looking for."
   - *Interest domains*, multi-select mono chips, amber when selected:
     VLSI · IoT · Robotics · Web Development · App Development · AI/ML ·
     Open Source · Cybersecurity · Sustainability Tech · FinTech · HealthTech ·
     Aerospace · Game Dev · Research · Competitive Programming · Design
   - *What are you looking for right now?* — six icon cards, single select:
     Hackathon Team ("I want to compete") · Research Project ("I want to publish
     or explore") · Startup / Idea ("I'm building something") · Side Project
     ("I want to make something cool") · Collab & Learn ("I want to grow with
     others") · Open to Anything ("Surprise me")
4. **How serious are you?** — "So we can match you with the right people."
   Three icon rows, single select: Casual ("Exploring and learning. Low
   pressure.") · Serious ("Hackathon-ready. Can commit on weekends.") ·
   Startup-focused ("All-in. Building something real.")
   Then *Availability* chips: Weekday evenings · Weekends · Full week ·
   Flexible · Currently busy
5. **Link your profiles** — "All optional. Helps teammates know you're real."
   GitHub URL · LinkedIn URL · Devfolio URL · Portfolio/Website · WhatsApp
   number ("Shared only when someone accepts your Nudge") · Short bio (0/200)
6. **Here's how you appear to others** — renders the profile card as others see
   it, then "Let's go". Footnote: "You can edit this anytime from your profile."

**Data this needs that `profiles` lacks:** `registration_no`, `interests[]`,
`commitment_band` (casual|serious|startup), `availability_band`, `github_url`,
`linkedin_url`, `devfolio_url`, `portfolio_url`, `whatsapp` (private until a
Nudge is accepted). Already present: `year`, `looking_for`,
`experience_level`, `commitment_level` (1–5, which the engine scores),
`availability_windows` (structured jsonb, which the engine intersects — richer
than the prototype's single `availability_band` chip, and not a downgrade).

## 2. Nudges — the connection primitive

Replaces chat entirely. You **Send Nudge** to a person, or hit **I'm Interested**
on a team request. The recipient accepts or declines; **WhatsApp number is
revealed only on accept**. There is a `Nudges` inbox and a `Notifications` page.

This is the single most important missing feature: without it the app can
surface a match but cannot let two people actually connect.

Needs: `nudges(from_profile, to_profile, subject_type, subject_id, message,
status: pending|accepted|declined, created_at)`.

## 3. Home

Three-column: sidebar · feed · right rail.
- **People with skills you need** — horizontal carousel of person cards
  (avatar, name, dept · year, mono skill chips, a "looking for" chip) each with
  a **Send Nudge** button. "See all →".
- **Open teams looking for members** — team-request cards with a coloured left
  border, owner line, "Needs: X" chips, effort chip (`10-15 hrs/week`),
  "NaNd left" (a deadline countdown — buggy in the Lovable build), and an
  **I'm Interested** button.
- **Right rail** — *Profile Strength* as a ring percentage with a nudge to
  improve it ("Write a short bio to stand out", "Edit Profile →"); *Quick
  Actions* (Post a Team Request · Browse Hackathon Teams · Go to Discover);
  *Upcoming* (hackathon listings — this is where the repo's real ingested
  events belong).

## 4. Team Board

"Find your next team. Or post what you need." Filter chips:
`All · Hackathon · Research · Startup · Side Project`. Each request card:
title, owner (avatar · name · dept), a paragraph of free text describing the
need, `Needs: <role>` chips in amber, a type chip and an effort chip, a
`Closes in N days` line, and **I'm Interested**.

Note this is a *request board written in prose*, distinct from the repo's
structured requirement builder. Both should exist: the prose post is how people
actually write, the structured requirements are what the engine scores.

## 5. Idea Board

Not captured in the screenshots. Assume: post an idea, others express interest,
ideas can become team requests.

## 6. Communities

"Join the circles you build in. Share progress, ask for help, find
collaborators." Search field, `All` / `My communities (N)` toggle. Grid of topic
cards, each with an icon tile, name, one-line description, `N members · N posts`,
and **Join** (solid emerald) + **Open** (outline).

Seeded topics: AI/ML · App Development · Cybersecurity · Hackathons ·
IoT & Embedded · Research & Academia · Robotics & Automation · Startups &
Founders · Sustainability Tech · VLSI & Chip Design · Web Development

`supabase/guild/0001_schema.sql` declares `communities` and `community_members`,
but nothing in the repo applies that file and no code reads either table.

## 7. My Profile

Header: avatar, name, `Dept · Year` with a verified tick, "Joined August 2026",
and three actions: **Edit Profile** (solid emerald), **Guild Card** (outline,
a shareable card), and a share icon button.
Body: `Looking for` / `Commitment` / `Availability` chips, `Skills` (mono chips,
emerald), `Interests` (mono chips, amber), `Portfolio links` as icon tiles
(GitHub, LinkedIn, Devfolio, website).

---

## Design system — the prototype's, NOT this repo's

None of the following was ported. It is recorded only so nobody mistakes a
screenshot of the prototype for a bug in this app.

| | Lovable prototype | **This repo** |
| --- | --- | --- |
| Stylesheet | `src/app/globals.css` | `app/globals.css` — **there is no `src/` directory here** |
| Canvas | `#0b0e11` (dark) | `#f5f6fa` (light) — `--canvas` |
| Cards | `#131820` | `#ffffff` — `--surface` |
| Accent | emerald `#10e098` | indigo `#5b5bd6` — `--accent`, the only accent |
| Secondary colour | amber = interests, violet = effort | none; nothing else is coloured |
| Chips | `.g-chip`, `.g-chip-accent`, … | `components/ui/pill.tsx`; no `.g-chip` class exists |
| Display type | Space Grotesk | Inter (400/500/600), with JetBrains Mono for figures |
| Logo | `public/brand/guild-logo.png`, `mix-blend-screen` on dark | `public/guild-logo.png`, via `components/brand-mark.tsx` |

The one rule that did carry over: the logo is ONE image — the mark and the
wordmark are the same artwork and must never be separated or retyped.

## If this direction were ever picked up

An ordering, not a commitment. Nothing here is scheduled; `ROADMAP.md` is what
is actually next.

1. **Nudges** (table, send, inbox, accept → reveal contact). This is the only
   item that changes what the product can do: today Guild can *identify* the
   right teammate and cannot let you contact them. Everything else on this list
   is surface area.
2. Extend the profile schema + a multi-step onboarding wizard.
3. Prose team requests (`Needs:` chips) alongside the structured requirements —
   the prose post is how people actually write, the structured requirements are
   what the engine scores. Both should exist.
4. Home three-column with Profile Strength and Quick Actions.
5. Communities — `supabase/guild/0001_schema.sql` declares `communities` and
   `community_members`, but nothing applies that file and nothing reads them.
6. Idea Board.

The scoring engine stays exactly as it is. It is what makes any of these
rankings better than a filter list.
