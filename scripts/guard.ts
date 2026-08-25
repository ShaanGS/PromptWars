/**
 * The ALLOW_PROD_WRITES guard.
 *
 * Every write script here points at the production database -- there is no
 * staging, so "a quick local run" and "mutating real data" are the same act.
 * The flag in `.env.local` promised this guard on 2026-08-06; scripts started
 * honouring it 2026-08-24. GitHub Actions is exempt: ingestion is SUPPOSED to
 * write from there, and its env carries no `.env.local` to flip.
 *
 * Read-only scripts (healthcheck, connector-test, luma-check) stay unguarded
 * on purpose -- a guard that also blocks harmless reads gets exported into
 * muscle memory as "always set the flag", which unmakes the guard.
 */

/** Pure so the rule is testable: CI always may; local only when asked. */
export function prodWritesAllowed(env: Record<string, string | undefined>): boolean {
  if (env.GITHUB_ACTIONS === 'true') return true
  return env.ALLOW_PROD_WRITES === 'true' || env.ALLOW_PROD_WRITES === '1'
}

/** Call first thing in a write script's main(). Exits rather than throws. */
export function assertProdWritesAllowed(script: string): void {
  if (prodWritesAllowed(process.env)) return
  console.error(
    `${script}: refusing to write to the production database.\n` +
      `This is the ALLOW_PROD_WRITES guard (.env.local). For a deliberate\n` +
      `local run, either set ALLOW_PROD_WRITES=true in .env.local or prefix\n` +
      `this one invocation:\n` +
      `  PowerShell:  $env:ALLOW_PROD_WRITES='true'; npm run ${script}\n` +
      `  bash:        ALLOW_PROD_WRITES=true npm run ${script}`,
  )
  process.exit(1)
}
