# Decision records

One short file per settled decision — the constraint, the decision, and
the failure it prevents. These are the rules a change must not quietly
break; if a new feature fights one of them, the record gets revisited
explicitly, not overridden in passing.

Format: ADR-lite, numbered in the order they were settled. A superseded
record is marked at the top and kept, never deleted.

These are **Olvable's** decisions. Guild's — the scoring model and the demo
posture — are in [`../decisions.md`](../decisions.md). Records 001 and 008 were
superseded on 2026-08-25 by the no-login demo build; both carry a banner
saying so.

| #                                            | Decision                                                               | Settled            |
| -------------------------------------------- | ---------------------------------------------------------------------- | ------------------ |
| [001](001-auth-email-password-no-signup.md)  | Email + password, no sign-up, no email sending — **superseded**        | 2026-08-05 / 08-23 |
| [002](002-ingestion-on-github-actions.md)    | Ingestion runs on GitHub Actions, not Vercel                           | 2026-08-05         |
| [003](003-nothing-silently-deleted.md)       | The pipeline never silently deletes                                    | 2026-08-05         |
| [004](004-geo-asymmetry.md)                  | Geo: local sources keep-unless-elsewhere; national sources prove-local | 2026-08-23         |
| [005](005-scoring-cheapest-path-first.md)    | Scoring: keyword pass first, LLM for the middle, fit at request time   | 2026-08-23         |
| [006](006-deadline-sources.md)               | Deadline sources are a separate surface, keyed on the cutoff           | 2026-08-23         |
| [007](007-excerpts-not-full-descriptions.md) | Descriptions are excerpts with a link out, never full prose            | 2026-08-23         |
| [008](008-public-surface-one-page.md)        | The public surface is one page per event — **superseded**              | 2026-08-24         |
| [009](009-config-in-git.md)                  | Config lives in git; the DB is the runtime copy                        | 2026-08-05         |
| [010](010-hygiene-tooling.md)                | Prettier + CI as the gate; no pre-commit hook; ADR-lite records        | 2026-08-24         |
| [011](011-feed-opt-in-sources.md)            | High-volume sources are feed-opt-in, not feed-default                  | 2026-08-24         |
