# Working agreement

For any agent (or human) working in this repo. Agreed with Shaan
2026-08-06 after a session that sprawled; formalised here 2026-08-24.
`CLAUDE.md` points at this file.

## The four rules

1. **Plan before code.** Write the plan, agree it, then implement.
   Feature plans live in `docs/ROADMAP.md`; a session starts from an
   agreed roadmap item, not from an idea mid-conversation.
2. **One feature per session.** Do not mix infrastructure and features.
   A hygiene commit must not change behaviour — a behaviour change hidden
   in a cleanup is the first thing a reader distrusts.
3. **Verify against the live system, never assume.** Nearly every bug in
   this project was found by running something, not by reading code. The
   session is not done until the live check in the plan has been run.
4. **State facts, not hopes.** "It is live" only after the headers or the
   logs say so. "Tests pass" only after they ran.

## Verification

- Every session plan ends with a **Verify** block; run it, don't skim it.
- Auth-facing changes are checked with a throwaway account, signed in
  from a fresh/incognito window — the recipe is in `CONTRIBUTING.md`.
- Pure logic gets a Vitest test next to the module (`foo.test.ts`).
  Connectors are additionally checked against the live site with
  `npm run connector:test -- <source>` — fixtures catch our regressions,
  only the live run catches the remote site changing, which is the
  failure mode that actually happens.
- `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm run test` pass before commit — the same set CI runs on every push.

## The voice of comments

Comments in this codebase record **why**, never what. The house shape: the
decision, the failure it prevents, and — when it was learned the hard
way — the date. Example from `lib/pipeline/geo.ts`: the OUT_OF_SCOPE list
explains that without it, the classifier dropped a real Chennai hackathon
at "Freshworks", a venue string with no geographic signal.

Do not add comments that narrate the code, cite the change that added
them, or argue the change is correct. Match the density that is already
there; if a module carries a header explaining its reason to exist, keep
it accurate when the reason shifts.

## Product rules that look like style but are not

- The product is **Olvable**. "EventNadu" must not appear in anything new.
- No sign-up, no email sending, no self-serve password reset — accounts
  come from the admin, full stop. Do not add flows that quietly assume
  email exists.
- Nothing is silently deleted in the pipeline: filtered rows keep a
  status (`filtered_geo`, `filtered_quality`) so the UI can prove nothing
  real was thrown away.
- No env var becomes `NEXT_PUBLIC_`. The service role key bypasses RLS.
- Free-tier limits (Vercel 300s functions, Supabase pause-after-7-days,
  Groq org-level rate limits) are load-bearing constraints; check against
  them before proposing infrastructure.
- Config lives in git (`config/sources.ts`, interest profile); the DB is
  the runtime copy, and `npm run seed` resets it toward git — that
  direction, never the reverse.

## Environment gotchas

- Windows, PowerShell-first machine, repo inside OneDrive. `npx` is
  blocked by execution policy — use `npx.cmd`. Bash one-liners with
  grep/cut over `.env` files are unreliable here.
- Claude's sandboxed shell shadows `%APPDATA%`, so it cannot see the real
  Vercel CLI login. Vercel account actions are run by Shaan in his own
  terminal.
- tsx compiles `scripts/` to CJS: **no top-level await** — wrap in
  `main()`. Scripts must `import './load-env'` first or env vars are
  missing. `server-only` cannot be imported by tsx scripts.
- Line endings are settled: the repo stores LF (`.gitattributes`
  `eol=lf`, shipped 4.2) — do not hand-flip endings or add per-file
  overrides.

## Where things are written down

- `docs/ROADMAP.md` — what is next, one screen. The current session
  should be an item here before code starts.
- `docs/CHANGELOG.md` — what shipped, dated, newest first. A finished
  session adds its entry here, keeping what was learned by shipping it.
- `docs/decisions/` — settled decisions, one ADR-lite file each, with an
  index. A change that fights one revisits the record explicitly.
- `docs/ARCHITECTURE.md` — the pipeline and app maps, and where X lives.
- `docs/REBUILD-PLAN.md` — the 2026-08-06 rebuild. History; gap statuses
  are updated in place rather than the text rewritten.
- `supabase/migrations/` — numbered SQL, prose header stating why, never
  edited after they have been applied.
