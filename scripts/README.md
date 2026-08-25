# Scripts

One line each; the header comment inside each file carries the why and the
usage. All run via `npm run <name>` (see `package.json`), all load env from
`.env.local` via `./load-env`, and none may use top-level await (tsx
compiles to CJS).

| Script              | npm run                       | One line                                                                      |
| ------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `ingest.ts`         | `ingest -- <src>`             | One source end to end: reap stale runs → fetch → raw → gates → upsert.        |
| `score.ts`          | `score`                       | Score stale/unscored events: keyword pass, then capped LLM calls.             |
| `seed.ts`           | `seed`                        | Push `config/sources.ts` + profile hash into the DB (git → DB, decision 009). |
| `reclassify.ts`     | `reclassify -- <src>`         | Re-apply the current geo rule to stored rows ingest will not re-fetch.        |
| `connector-test.ts` | `connector:test -- <src>`     | Parse the LIVE site, write nothing — catches the remote changing.             |
| `luma-check.ts`     | `luma:check [slugs]`          | Verify Luma calendar slugs before configuring them (bad slugs fail quietly).  |
| `healthcheck.ts`    | `healthcheck`                 | Free-tier keep-alive + loud failure when a source is 48h stale.               |
| `create-user.ts`    | `user:create -- <email> <pw>` | Create or re-password an account, no email sent (prefer `/admin`).            |
| `grant-admin.ts`    | `admin:grant -- <email>`      | Bootstrap the admin role — deliberately terminal-only.                        |
| `load-env.ts`       | (imported)                    | Loads `.env.local` then `.env` for every script; import it first.             |
