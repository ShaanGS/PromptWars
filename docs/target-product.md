# Target product — the Lovable build

Shaan built Guild in Lovable and it is the reference for **what the app does**.
The current repo has the engine and the data; the Lovable build has the product
around it. This file is the gap list. Screens below are transcribed from the
build, not invented.

The one-line difference: today's repo is a *team scoring tool*. The target is a
*campus network* where scoring is one feature among several, and the connection
primitive is a **Nudge**.

---

## Navigation

Sidebar, dark, emerald active state with a left border:
`Home · Discover · Team Board · Idea Board · Communities · Notifications ·
Nudges · My Profile`, then `Settings` and the user block pinned at the bottom.

Current repo has: Dashboard, Events, Squads, People, Your profile.
Missing: Discover, Team Board, Idea Board, Communities, Notifications, Nudges.

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

**Data this needs that the schema lacks:** `year_of_study`, `registration_no`,
`interests[]`, `looking_for`, `commitment_band` (casual|serious|startup),
`availability_band`, `github_url`, `linkedin_url`, `devfolio_url`,
`portfolio_url`, `whatsapp` (private until a Nudge is accepted).

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

The repo already has `communities` and `community_members` tables, unused.

## 7. My Profile

Header: avatar, name, `Dept · Year` with a verified tick, "Joined August 2026",
and three actions: **Edit Profile** (solid emerald), **Guild Card** (outline,
a shareable card), and a share icon button.
Body: `Looking for` / `Commitment` / `Availability` chips, `Skills` (mono chips,
emerald), `Interests` (mono chips, amber), `Portfolio links` as icon tiles
(GitHub, LinkedIn, Devfolio, website).

---

## Design system (matches the Lovable build)

Already ported into `src/app/globals.css`:
- Canvas `#0b0e11`, cards `#131820`, borders `#222b36`.
- **One emerald accent `#10e098`** — marks what is live, chosen or actionable.
- **Amber `#e8a33d` = interests. Violet `#8b7bf0` = effort/hours.** Nothing else
  is coloured.
- **Chips are mono** (`.g-chip`, `.g-chip-accent`, `.g-chip-amber`,
  `.g-chip-violet`). This is the signature of the system.
- Display type: Space Grotesk (headings). Body: Inter. Chips/figures: JetBrains
  Mono.
- Logo: `public/brand/guild-logo.png`, used as ONE image — the mark and the
  wordmark are the same artwork and must never be separated or retyped. On the
  dark canvas it renders with `mix-blend-screen` so the black drops out.

## Build order suggestion

1. Extend the profile schema + rebuild onboarding as the 6-step wizard.
2. Nudges (table, send, inbox, accept → reveal WhatsApp). Nothing else matters
   until two people can connect.
3. Team Board (prose posts + `Needs:` chips) on top of the existing projects.
4. Home three-column with Profile Strength and Quick Actions.
5. Communities (tables already exist).
6. Idea Board.

The scoring engine stays exactly as it is — it is what makes the ranking on
Discover and "People with skills you need" better than a filter list. It is the
differentiator, not the product.
