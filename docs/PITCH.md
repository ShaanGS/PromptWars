# Guild — the pitch

Problem Statement 2 (ProjectMatch). Live at `https://tryguild.vercel.app`, no
login. Everything spoken below is written to be said out loud. Every number was
computed by the engine against the seeded database, not typed in by hand.

---

## 1. The 30-second hook

> Five friends enter a hackathon. All five are backend developers.
>
> They know this. They joke about it on day one. And they still ship a login
> page that looks like it's from 2009, and a pitch nobody rehearsed.
>
> Four strangers beat them. Not because they were better engineers. Because one
> of them was a designer.
>
> Every tool built for that problem is a search box. And a search box makes it
> worse, because it has no idea what you already have.
>
> Write the type signature down. A search ranker is `score(candidate, query)`.
> Team quality is `score(candidate, roster)`. That is a different function. It
> takes an argument the first one doesn't have.
>
> Guild is a tool that argues with you about who you actually need.

_Delivery: slow down on "because one of them was a designer" and stop. The
type-signature line is for the technical judge; the first three lines are for
everyone else. Do not cut either half._

---

## 2. The 2-minute pitch

> **The problem.** The operative word in the statement is _complementary_.
> Filtering `skill = react` is a `WHERE` clause. The hard part is that the best
> individuals do not make the best team. Rank people by raw ability and you hand
> a hackathon five React developers and no designer — which is the exact failure
> the statement describes. A skill filter doesn't just fail to prevent that team.
> It produces it.
>
> **The insight.** A search ranker is invariant to your roster by construction —
> the roster is not one of its inputs. But the correct ranking demonstrably
> changes when the roster changes. You cannot fix that with better embeddings or
> a better re-ranker. You fix it by changing the function. So Guild stops scoring
> people. It scores teams against a project's weighted requirements, and it ranks
> a person only by their marginal gain to _that_ roster.
>
> **The maths, in one line.** Coverage of a requirement is a probabilistic OR:
> one minus the product of everyone's misses. Two people at 0.8 and 0.5 on the
> same skill give 0.90, not 1.3. A second React developer moves that requirement
> from 0.80 to 0.90. The designer you don't have moves one from zero.
> Diminishing returns is not a penalty term anyone tuned. It is what a product of
> complements does. Which means the ranking cannot be gamed by piling on more of
> the same person, because there is no constant to turn that would let it be.
>
> **The product.** You open a squad. You see its requirements as slots and which
> ones are open. Every person in the pool is ranked by what they'd add to this
> roster, with a reason attached — "fills Designer", "already covered by Rohan".
> Auto-draft plays the greedy algorithm out loud, one pick at a time. And the
> Team X-ray tells you how the team will _fail_, not just whether it matches:
> which requirement rests on one person, whether you share any hours in the week
> at all, how far apart your commitment levels are.
>
> **Two things that are genuinely novel.** Credibility is modelled, not assumed:
> a skill claim with a link to real work counts in full, an unbacked claim counts
> at 0.6, because self-reported tags are the least reliable thing on any profile.
> And coverage is only 60% of the score. The other 40% is coordination — shared
> hours, experience spread, commitment spread — which is why marginal gain can go
> negative. Guild will tell you not to recruit.
>
> **Why it's feasible.** It's deployed, there's no login, you can open it on your
> phone right now. The scoring engine imports nothing — not React, not the
> database, not a date library — so the identical code ranks on the server and
> re-scores in your browser on every click with no round trip, and 41 tests over
> the maths run in 300 milliseconds. 241 tests across the repo. No language model
> touches the ranking anywhere; it's deterministic arithmetic, so it replays
> identically every run and you can check any number against the formula by hand.
> And the squads form around real hackathons — a squad is joined by a foreign key
> to a listing from Devfolio, Devpost or Unstop that you can click through and
> verify.
>
> **How it differs.** Not the model — the unit. Everyone else's unit is a person
> matching a query. Mine is a gap matching a roster. Everything follows from that
> one choice, including the feed: "Squads looking for you" ranks open teams by
> _your_ marginal gain to _them_.

_If you must cut: drop the "two things that are genuinely novel" paragraph. The
demo shows the coordination term implicitly and Q&A covers the damp._

---

## 3. The demo script — 90 seconds

**Before anyone is watching:** open `tryguild.vercel.app`, click into
**CropGuard — on-device crop disease detection** from the Team Board, press
**Reset**. Leave it on screen. Do not navigate during the pitch.

**Beat 1 — the state. (10s)**

> "CropGuard. Two people on it, an ML person and a backend person. Both
> technical. It sits at **55 percent**."

_Point at the slots, not at the roster pill._

> "Five weighted requirements. ML Engineer is at 70, Backend at 75. **Frontend,
> Designer and Pitch are all at zero.** This is the five-backend-devs team. It
> just hasn't noticed yet."

**Beat 2 — the tie. (12s)**

_Point at the ranked candidate list._

> "Top of the list: **Meera Pillai, figma 0.85, backed by a link — plus 7.8
> percent.** Tied with **Rohan Iyer, react 0.85 — also plus 7.8.** Behind them
> **Vikram Nair, react 0.80 — plus 7.2.** Right now the model doesn't care that
> React is the deeper stack. All three fill a slot that's at zero."

**Beat 3 — the prediction. Say this BEFORE touching anything. (15s)**

> "I'm going to add Rohan. Before I do, I'll tell you what's about to happen.
>
> Watch **Vikram**. React 0.80, backed. On paper the strongest React profile left
> in this pool — any skill filter puts him near the top and leaves him there.
> He's worth 7.2 right now.
>
> I'm predicting that adding one person makes him nearly worthless, and I am not
> going to touch his profile."

**Beat 4 — click Rohan. Then be quiet for two seconds. (15s)**

> "**Vikram: plus 1.6 percent.** From 7.2 to 1.6.
>
> Nothing about Vikram changed. No new data, no retraining, no network request at
> all — the engine re-ran in your browser. The roster changed, and the roster is
> the only input that matters."

**Beat 5 — the arithmetic, out loud, one breath. (12s)**

> "Here's the whole thing on a whiteboard. Frontend was at zero. Rohan takes it
> to 0.85. Vikram can only take it from 0.85 to **0.97** — one minus 0.15 times
> 0.20. That's twelve points of coverage on a requirement weighted 2 out of 10,
> times the 0.60 coverage weight. **1.4 points.** The rest is rounding on the
> coordination terms. No rule anywhere says 'penalise the second React
> developer.' It's a product of complements."

**Beat 6 — press Reset, then Auto-draft. Narrate over it. (20s)**

_It seats one person every 420ms. There is no Stop button — Reset is the only
abort._

> "Now watch it play greedy out loud, re-ranking all 40 people after every seat.
> **Meera, plus 7.8 — 62.5. Rohan, plus 10.1 — 72.6. Kabir, plus 4.8 — 77.4.
> Kavya, plus 2.2 — 79.6.**
>
> 55 to 79.6, from the same pool that team could already see. It just never
> argued with itself about who to ask. And it's deterministic — run it again, you
> get those four names in that order, every time."

**Beat 7 — the honest close. Say it while the screen is still up. (8s)**

> "It stopped at six people — that's the roster cap, one more than the five
> requirements. And if I refresh this page, all of it is gone. Guild is read-only
> today. I'll tell you the bigger gap before you ask it."

_Hand over the keyboard if a judge wants it. It's client-side and read-only;
Reset restores the original roster and there's nothing they can break._

### Stagecraft warnings — know these before you go on stage

- **The board card and the sandbox show different numbers for the same squad.**
  The card renders pure coverage (CropGuard reads 36, "Thin"); the sandbox
  renders the composite score (55%). Nothing on either screen explains the gap.
  If a judge catches it: _"That's a labelling bug on the board — it renders
  coverage, the sandbox renders the full score. Same model, two different
  numbers on screen, and I should be showing one."_
- **The "N on the roster" pill never updates.** It's server-rendered outside the
  client component. Add three people and it still reads "1 on the roster." Don't
  point at it.
- **A member who covers nothing cannot be removed** except by Reset.
- **The for-you rail shows one card**, and that squad is rendered a second time
  in "All squads" with a different colour.
- **Stay on `/teams`, `/squad/[id]`, `/people`, `/p/[handle]`, `/hackathons`.**
  `/events`, `/calendar`, `/saved`, `/sources` and `/interests` are broken or
  empty in this build because auth was stripped for judging.
- **Under reduced-motion, auto-draft applies every pick at once** rather than
  stepping. If the judge's machine has it on, the beat lands differently.

---

## 4. The one-liner

> **Skill search ranks people against your query. Guild ranks them against your
> roster — which is why the best candidate changes the moment you take one.**

_Second line if the slide allows one: "Two people at 0.8 and 0.5 cover 90%, not
130%. That one line is the whole product."_

---

## 5. What everyone else built vs what Guild does

| What everyone else built                                  | What Guild does                                                                                 | Why that matters                                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `score(candidate, query)` — a ranker with no roster input | `score(candidate, roster)` — marginal gain to a specific team                                   | A function without the roster as an argument cannot re-rank when the roster moves. Vikram is worth 7.2 before one hire and 1.6 after. |
| Skills summed or averaged, so more is always better       | Coverage as `1 − Π(1 − p_eff)`                                                                  | Diminishing returns falls out of multiplication. Nobody wrote a duplicate-penalty rule, so nobody can tune one off.                   |
| Self-reported skill tags taken at face value              | A claim with a proof link counts in full; an unbacked one counts at 0.6                         | Skill tags are the least reliable field on any profile. The model prices that instead of trusting it.                                 |
| An LLM ranks and explains, approximately                  | Deterministic arithmetic, 41 tests over the claims, no model in the ranking path                | Every number replays identically and can be checked by hand. The demo cannot drift between runs.                                      |
| Invented sample projects                                  | Squads carry a foreign key to a real Devfolio / Devpost / Unstop listing                        | The demand side is checkable. A judge can click through to a hackathon that exists.                                                   |
| Matching stops at "here are people who fit"               | Team X-ray: bus factor, shared-hours dead zones, commitment spread — and negative marginal gain | It tells you how a team will fail, and it will tell you not to recruit someone.                                                       |

---

## 6. Judge Q&A

**1. What does "verified" actually mean? Who checks it?**

It means a link was supplied. Nothing fetches it. The model discounts the
_absence_ of evidence; it does not validate the _presence_ of it. That's still a
real signal — pasting a link a teammate can open costs something that ticking a
checkbox doesn't, and the 0.6 damp prices the difference. But I called it
"verified" and that word promises checking I don't do. The honest word is
_evidenced_. The fix is cheap and it's next: fetch the URL, confirm it resolves,
confirm the repo's language or the page text touches the claimed skill, and split
the damp into three tiers instead of two.

**2. Probabilistic OR assumes independence. Two people's competence on the same
skill isn't independent. Is this just a formula wearing a maths costume?**

You're right about the narrow version. `p_eff` is not a calibrated probability.
It's a self-reported proficiency, damped, that I treat as one. I have no outcome
data saying a 0.8 claim succeeds 80% of the time.

What I actually claim is weaker and still strong: the product form is the right
_shape_. It's monotone — another person never hurts coverage. It saturates at 1 —
you can't stack past "covered". It's order-independent — the same set gives the
same number however you built it. And filling a zero is strictly more valuable
than reinforcing a 0.8, at every parameter setting. Those four properties hold
whether or not independence is literally true. A weighted sum gives you none of
them. A hand-written duplicate penalty gives you them only where someone
remembered to write the rule.

**3. You hand-picked 0.60/0.15/0.15/0.10 and you hand-picked the 0.6 damp. So
it's still vibes, one level down.**

Partly yes, and I'll be precise about which part. The four weights and the damp
are chosen, not learned. I have no completed hackathons to fit them against.
Anyone telling you their weights are validated at a hackathon demo is telling you
a story.

But the property I call emergent isn't in the weights. Diminishing returns comes
from the product form inside a single requirement, and it holds for any positive
weighting of the four terms. Set coverage to 0.9 or to 0.3 and Vikram still
collapses relative to Meera. The only thing that could switch it off is turning
`Π(1 − p)` into a sum, which is a different product. Every constant lives in one
file, none is inlined in the UI, and 41 tests pin the claims rather than the
implementation. Those weights are the first thing I'd fit the day there are real
outcomes.

**4. Walk me through why Meera goes from +7.8 to +10.1.**

Good question, because it isn't complementarity and I'd be overselling if I said
it was. Her coverage contribution is identical in both cases: Designer 0 to 0.85,
weight 2 of 10, times 0.60 — the same +10.2 points either way. The 2.3-point
difference is the commitment term. On the two-person team, Aarav and Diya are
both commitment 5, so the spread is zero, and Meera at 4 opens a spread of 1 —
that costs 2.5 points. Rohan is also 4, so once he's seated that cost is already
paid and Meera's number comes back clean. Her rise is coordination accounting.

**The complementarity proof is Vikram, not Meera:** 7.2 before Rohan, 1.6 after.
That one is pure `1 − Π(1 − p)` and decomposes on a whiteboard. That's the beat I
should be making the argument on.

**5. Auto-draft stopped at 79.6%. Prove it wouldn't have kept going.**

It would have. There are two stop conditions — a roster cap and a 0.5% gain
floor. On this squad the cap binds first: six people, one more than the five
requirements. At the stop point the best remaining candidate is Vikram at
**+1.5%**, three times the floor. So the floor is not what stopped it. The floor
does exist and does bind on other rosters; on this one it doesn't, and the line
in my README saying otherwise is wrong. I'd rather correct it than have you find
it.

**6. Complementarity over-fits. Five people with disjoint skills who never meet
is not a good team, and your objective would love it.**

It wouldn't, and that's the most deliberate part of the design. Coverage is only
0.60 of the score. The other 0.40 is coordination: 0.15 shared availability —
weekly minutes in the intersection of _all_ members' windows — 0.15 experience
balance as one minus variance, 0.10 commitment spread.

Concretely, on the three-person CropGuard team, **29 of the 37 remaining people
in the pool have negative marginal gain.** The worst is Karthik — backend 0.90,
backed, the strongest backend profile in the pool — at **minus 13 percent**,
because he's weekend-mornings-only against an evenings team and commitment 2
against a team of 5s. The model says adding him makes the team worse.

One honest caveat: you can't see that on screen. The candidate list renders the
top ten, so negative deltas never surface. It's a UI limit, not a model limit —
the behaviour is pinned by one of the 41 tests. And where you're right: I model
no interpersonal fit at all. No communication style, no prior collaboration, no
trust graph. Coordination here is calendars, seniority and keenness. Three cheap
proxies, and a real ceiling.

**7. It's read-only and you can't contact anyone. What am I actually judging?**

You've named the biggest gap, so let me name it precisely rather than soften it.
The sandbox roster lives in React state and dies on refresh. There is no server
action anywhere in this codebase that writes a membership. And there's no way to
message anyone: Guild identifies exactly who you're missing, and then stops. The
funnel ends one step short of the thing that matters.

What you're judging is the part that's hard to rebuild: a model that is pure,
deterministic, and tested against its claims, plus a demand side already wired to
live listings. The write path is a week, not a rewrite — one `nudges` table, one
send-and-accept flow where the contact detail is revealed only if the recipient
accepts, and one real form at `/teams/new` so squads can be posted instead of
seeded. That's the top of my roadmap, and I'd rather be judged on knowing it than
on a demo that pretended otherwise.

**8. Forty generated profiles. Isn't the whole thing a cold-start problem?**

Yes, and it's unhandled. This model is only ever as good as the pool it can see —
marginal gain is a useless signal if the person you're missing isn't reachable.
That's also why the plan is one campus at a time rather than a national launch.
Team formation is a density problem: a campus is a naturally dense pool where
supply and demand already sit in one place — students co-located, looking at the
same deadlines. SRM first, one hackathon season, with the clubs that already run
those events as distribution. Prove the loop closes there before adding a second
campus.

Two things I did do about it in the meantime. The 0.6 damp exists precisely
because a thin pool full of unproved claims is the expected input, so the model
prices bad input instead of trusting it. And the demo corpus is shaped
deliberately, which you should discount accordingly: React is over-supplied at 12
of 40 profiles, figma and pitching are deliberately scarce. I built the pool to
make the effect visible.

**9. Rank 1 of 400 on an automated grader. What does that actually tell me?**

That the code is real, legible and tested. Nothing about whether students form
better teams. And I'll give you the whole story rather than the good half. My
first submission scored **74.72**. Problem Statement Alignment came back at 37
while every other axis was high — not because the model was wrong, but because
the deployed app opened on an event feed and the README described an aggregator,
so the grader concluded I hadn't answered PS-2. I made the Team Board the front
door, rewrote the README around the formula, and took tests from 185 to 241.
Second attempt: **95.3, rank one.**

So treat it as evidence of engineering feasibility and of responding to a signal.
It is not evidence of product-market fit. I have zero real users.

**10. Is the ingestion pipeline actually running behind this demo?**

The events are real; the pipeline is not running against _this_ database. Those
25 hackathons are genuine listings pulled from the public Devfolio, Devpost and
Unstop APIs — click any squad's event link and you'll land on something you can
check. But they were fetched by a small standalone script and seeded. On this
demo project the scrape-runs table has zero rows and there are no LLM keys, so
the relevance scorer is dormant.

What is real: ten connectors, the ingest script, the quality gates, the geo
classifier and a date parser that refuses to let `03/04` become March fourth —
all built, committed, tested, with a daily workflow that runs against my
production aggregator, a separate database this build deliberately never touches.
Turning it on here is credentials and a toggle, not construction. I'd rather tell
you that than let you find the empty table.

### Short answers to keep loaded

- **"Is greedy optimal?"** No. Coverage alone is monotone submodular, so greedy
  would give you the 1−1/e guarantee there. The composite isn't monotone —
  negative deltas exist — so there's no approximation guarantee. It's a
  transparent heuristic that shows its working, not a solver.
- **"What if I type my own skill?"** Skill matching is exact string equality.
  `'React'` does not match `'react'`, and there's no normalisation layer anywhere
  in the codebase. Known, unfixed, one function's worth of work.
- **"Why no LLM?"** Because the ranking has to be checkable. An LLM in this path
  would make every number unreproducible and every explanation a guess about the
  model's own reasoning. There's an LLM in the ingestion side, where it's
  scoring event relevance and a wrong answer costs one badly-ranked listing.
- **"What did you build for this?"** The engine, the four Guild screens, the
  Guild data model and the tests. The event pipeline predates it — that's the
  point of grafting onto it rather than faking a demand side.

---

## 7. The 10-second version

> "Everyone built people-search with skill filters. Guild scores whole teams
> against what a project needs, and ranks you by how much you improve that
> specific team. So the second React developer is worth almost nothing, and the
> designer you don't have is worth everything — and nobody wrote that rule, it
> falls out of the maths. It's live, no login."

_If they take one more step: "Two people at 0.8 and 0.5 on the same skill cover
90 percent, not 130."_

---

## Appendix — fix before you pitch

Ordered by how badly it goes if a judge finds it first. None of these are
optional.

1. **CI has been red on `main` for the last five runs.** `npm ci` fails —
   `package-lock.json` is out of sync with `package.json` — and
   `npm run format:check` fails on 28 files including all 11 in `lib/engine/`.
   The tests genuinely pass locally, 241 of 241, but a judge opening GitHub sees
   red X's down the commit list next to a pitch about engineering rigour. Two
   commands: `npm install` and commit the lockfile, then `npm run format`.
2. **Fix the README's auto-draft line.** It says the 0.5% gain floor stopped the
   draft at 79.6%. The roster cap stopped it. Q5 above is the honest version.
3. **Rename "verified" to "evidenced" or "linked" in the UI copy.** It's a
   find-and-replace and it removes the teeth from the single most dangerous
   question in the room.
4. **Don't recite the six Hack2Skill axis scores.** Only "Problem Statement
   Alignment" is recorded anywhere in the repo, and the 37 was an attempt-1 axis
   while 95.3 is the attempt-2 overall — quoting them together mixes two runs.
   Recite the two overalls and that one axis.
5. **Check the CropGuard-linked hackathon is still open** on pitch day. If it
   has closed, downgrade to "real listings you can click through and check."
6. **Fix the doc contradictions a judge can grep**: `CLAUDE.md`, `AGENTS.md` and
   `docs/ARCHITECTURE.md` all say the engine has 17 tests — it has 41. README
   and `ARCHITECTURE.md` say five connectors — ten are built. `SECURITY.md`
   claims the admin surfaces are reachable — all four are closed. Nudges is
   listed twice in `ROADMAP.md`. None is fatal alone; together they read as a
   repo whose prose isn't maintained, which undercuts "every number has a reason
   attached."
