# Guild decisions (ADR-lite)

The rules behind the scoring model and the demo build. Olvable's own decisions
are in [`decisions/`](decisions/README.md), one file each; this page is Guild's
equivalent. Format is the same: the constraint, the decision, and the failure it
prevents.

Settled 2026-08-25 unless noted.

---

## The model

**Coverage is a probabilistic OR, not a sum or a max.**
`coverage(r) = 1 − Π(1 − p_eff)` over the members clearing `r`'s floor. A sum
lets five React developers "cover" a requirement 400%, which is how skill-filter
tools end up recommending a team with no designer. A max ignores redundancy
entirely, so it cannot tell a one-person dependency from a safe one. The product
gives both properties for free: it saturates, and the marginal value of the
_n_-th contributor falls automatically. **Diminishing returns is therefore not a
rule we implemented and could get wrong — it is arithmetic.** This is the single
decision the submission rests on.

**Ranking is by marginal gain, never by absolute score.**
`marginalGain(c) = score(T ∪ {c}) − score(T)`. Ranking candidates by their own
strength answers "who is best", which is not the question the problem statement
asks. Marginal gain answers "who does this team need", which is, and it is what
makes a mid-tier designer out-rank an excellent fifth React developer.

**Weights are 0.60 base / 0.15 overlap / 0.15 balance / 0.10 commitment.**
Skill coverage dominates because a team that cannot do the work fails regardless
of how well its calendars line up, but the other three are not tie-breakers
either — a team with zero shared hours is not a team. The split keeps
availability and experience able to change a ranking without ever overturning a
genuine capability gap. Changing these numbers changes what the demo
demonstrates; treat it as a product decision, not tuning.

**An unverified skill claim is damped to `0.6×`.**
Self-reported tags are the least reliable field on any profile, and a matching
tool that trusts them equally rewards whoever claims the most. Damping models
credibility instead of assuming it, and it gives people a reason to link a repo.
`0.6` is a judgement call, not a measurement — it is large enough to matter and
small enough that a strong unverified claim still beats a weak verified one.

**`minProficiency` is a hard gate, not a weight.**
Someone at 0.2 on a requirement that needs 0.5 contributes **nothing**, rather
than a little. A soft floor lets a crowd of beginners add up to "covered",
which is exactly the false confidence a team-formation tool must not produce.

**A requirement is one skill plus a display label**, not a role→skills bundle.
"Designer" as a bundle of six skills makes the arithmetic opaque; the whole
value of the model is that a person can be shown _why_ they rank where they do.

## The engine's shape

**`lib/engine/` imports nothing.** Not React, not Supabase, not Node, not a date
library — only its own siblings. Three payoffs: the maths is testable in
milliseconds with no fixtures or mocks; the identical code ranks on the server
and re-scores in the browser sandbox with no round trip and no chance of the two
drifting; and the product's core idea outlives this Next.js app. Adding one
import costs all three.

**All validation happens in `lib/team/mappers.ts`**, never in the engine.
The engine assumes well-formed input so it can stay small and total. That means
the mapper is the only thing standing between a malformed jsonb blob or a zero
weight and a `NaN` that silently poisons every score on the page — it is
deliberately defensive, and it is the right place to add a test.

## The demo build

**No login.** A judge must reach the product from a URL. `middleware.ts` is a
pass-through and `lib/auth/server.ts` returns one stand-in user rather than the
twenty-odd call sites being torn out, so restoring the gate is a revert.

**But the stand-in user is a `member`, not an admin.** Removing a login wall and
handing every anonymous visitor the corpus-editing and access-control screens
are two different decisions; only the first was asked for. `isAdmin()` reads the
real role. (One place does not yet enforce this — see
[`../SECURITY.md`](../SECURITY.md), which states the gap rather than hiding it.)

**Identity is one hard-coded handle** (`aarav`, `lib/demo.ts`). With no session
there is nothing to read an identity from, and a hard-coded handle means the
demo is byte-identical on every machine and after every reseed. `getDemoProfile()`
never throws — a demo that 500s because a row is missing is worse than a demo
that degrades.

**Guild is read-only.** No mutations, no forms, no server actions. It keeps the
demo unbreakable by a visitor, and it is why the team screens have no CSRF or
form-label surface at all.

**Publishable key, throwaway database, committed as a fallback.** The key is
public by design and ships in every client bundle; RLS is the security boundary,
and there is no service-role key in this build to bypass it. This is only
acceptable because the database is disposable and holds generated data. Full
statement in [`../SECURITY.md`](../SECURITY.md).

**Squads point at real ingested events** (`projects.event_id` → `events.id`).
Reusing Olvable's corpus means a squad forms around a hackathon that actually
exists with a real deadline, which is both more honest than placeholder data and
the reason the "interests" half of the problem statement has anywhere to live.

**Seed data is shaped to make the maths visible.** React is over-supplied across
12 of 40 profiles; `figma` and `pitching` are scarce. A demo that _asserts_
diminishing returns is a claim; one where the candidate list visibly re-ranks
when you add the first React developer is a demonstration.

---

## Superseded Olvable decisions

This build retires two of Olvable's records. They are kept in
[`decisions/`](decisions/README.md) with a banner, not deleted:

- **001 — Email + password, no sign-up.** Retired: there is no auth in this
  build. The record describes the gate to restore.
- **008 — The public surface is one page per event.** Retired: every route is
  public.
