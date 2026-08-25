# Security posture

This is a hackathon demo that must open for judges without an account. The
choices below are deliberate, and this file states them plainly rather than
leaving a reviewer to infer them from the code.

## Authentication is disabled on purpose

`middleware.ts` is a pass-through. `lib/auth/server.ts` returns a single
stand-in user so the twenty-odd call sites that expect a session keep working.

**The stand-in user is a `member`, not an admin.** `lib/auth/roles.ts`
`isAdmin()` defers to `roleOf()`, which reads the real role, so `/admin` and
its access-control screens stay closed even though there is no login. Removing
a sign-in step and handing every anonymous visitor the ability to edit the
event corpus are separate decisions; only the first one was intended. The
`/admin` routes are kept in the tree precisely so the authorization check
remains visible and testable.

## Keys

The app runs on the Supabase **publishable** key, which is public by design and
appears in `lib/supabase.ts` as a fallback. **There is no service-role key in
this build.** Nothing here can bypass row-level security.

`git ls-files` contains no `.env` file; `.env.local` is git-ignored.

## The database

The demo points at a throwaway Supabase project seeded with generated data
(40 fictional profiles, 5 squads) plus publicly-listed hackathons ingested from
Devfolio, Devpost and Unstop. Its tables carry open policies so the app can
read and write without a service role.

That is acceptable **only** because the database is disposable and holds no
real personal data. It must not be pointed at a production database — the open
policies would apply there too.

## Restoring real authentication

1. `git revert` the commits touching `middleware.ts`, `lib/auth/server.ts` and
   `lib/auth/roles.ts` (the original bodies are intact in history).
2. Replace the `demo_all` policies on the Guild tables with owner-scoped ones
   keyed on `auth.uid()`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and remove the fallbacks
   in `lib/supabase.ts`.

## Reporting

This is a student project. Open an issue on the repository.
