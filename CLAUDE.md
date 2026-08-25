# Guild

Team-formation platform for hackathon Problem Statement 2 (ProjectMatch), built
inside Olvable (Shaan's Chennai event aggregator, `ShaanGS/chennai-events`),
which supplies the shell, design system and event corpus.

Orient yourself before changing anything:

- **What it does and why the maths is the point** — [`README.md`](README.md)
- **Why there is no login, and what that does and does not protect** —
  [`SECURITY.md`](SECURITY.md)
- **How work happens here** — [`AGENTS.md`](AGENTS.md), included below
- **Where code lives** — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Three facts that catch agents out:

1. **`lib/engine/` imports nothing** and must stay that way. It is the scoring
   model, it is pure, and its 17 tests (`npx vitest run lib/engine`) pin the
   product's claims rather than its implementation.
2. **Auth is stubbed; authorization is not.** The stand-in user in
   `lib/auth/server.ts` is a `member`. Do not make `isAdmin()` return `true`,
   and do not add flows assuming a session or an email address.
3. **The product is Guild.** Docs that say the product is Olvable are stale;
   `docs/target-product.md` describes a parked alternative direction and is not
   this build's plan.

Code style: single quotes, no semicolons, 2-space indent. Comments explain
**why**. Run `npm run format` before committing — `.prettierrc.json` is the
authority and CI checks it.

@AGENTS.md
