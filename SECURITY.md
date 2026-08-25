# Security posture

This is a demo that must open for a judge without an account. The choices below
are deliberate. This file states them plainly — including where the
implementation currently falls short of the intent — rather than leaving a
reviewer to infer any of it from the code.

## Authentication is disabled on purpose

`middleware.ts` is a pass-through: it returns `NextResponse.next()` and gates
nothing. `lib/auth/server.ts` `getSessionUser()` returns a single stand-in user
instead of reading a session, so the twenty-odd call sites that expect one keep
working and every `if (!user) redirect('/login')` in the app falls through.

Both files keep their original shape and matcher so restoring the gate is a
revert, not a rewrite.

**Consequence, stated plainly: every route in this deployment is publicly
reachable by URL.** There is nothing to log into and nothing to log out of.

## Authorization is _not_ disabled

Removing a login wall and handing every anonymous visitor the corpus-editing
and access-control screens are two different decisions. Only the first was
intended.

The stand-in user carries `app_metadata.role = 'member'`. `lib/auth/roles.ts`
`isAdmin()` reads that role through `roleOf()` rather than returning `true`, so
the authorization layer is intact and the admin surface is meant to stay closed
even with no login.

What actually enforces that today:

| Surface                                            | Check                                                      | Enforced? |
| -------------------------------------------------- | ---------------------------------------------------------- | --------- |
| `/admin/add`                                       | `roleOf(user) !== 'admin'` → `redirect('/')`               | Yes       |
| `/admin/discovery`                                 | `roleOf(user) !== 'admin'` → `redirect('/')`               | Yes       |
| `/admin`                                           | `requireAdmin()` → asserts `isAdmin`, else `redirect('/')` | Yes       |
| `/design`                                          | `requireAdmin()`                                           | Yes       |
| `app/(app)/admin/**/actions.ts` (7 server actions) | `requireAdmin()`                                           | Yes       |

`requireAdmin()` asserts rather than assumes:

```ts
export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) redirect('/')
  return user
}
```

Because the stand-in user is a `member`, every surface above redirects to `/`
for an anonymous visitor. Server actions are their own entry points, so putting
the check inside `requireAdmin()` closes all seven at once rather than relying
on a page-level guard.

## Keys

The app runs on the Supabase **publishable** key, which is public by design and
ships in every client bundle. It appears in `lib/supabase.ts` as a fallback so
the demo runs with no `.env` file.

**There is no service-role key in this build.** Nothing here can bypass
row-level security, because nothing here holds a credential that could.

`git ls-files` contains no `.env` file of any kind; `.env.local` is ignored.

## The database

The demo points at a throwaway Supabase project seeded by `seed/seed-demo.mjs`:
40 fictional profiles, 5 squads, and publicly-listed hackathons ingested from
Devfolio, Devpost and Unstop. Its Guild tables carry open (`demo_all`) policies
so the app can read them without a service role.

Two things follow, and both matter:

- That is acceptable **only** because the database is disposable and holds no
  real personal data. Pointing this build at a production database would apply
  the same open policies there.
- `supabase/guild/0002_rls.sql` in this repo describes careful, ownership-scoped
  policies keyed on `auth.uid()`. **Those are not what is deployed.** Read that
  file as the intended end state for a real deployment, not as a description of
  the demo database. No file in this repo creates the open demo policies; they
  were applied by hand.

Shaan's real Olvable production database is a separate Supabase project holding
~1,300 real events and real user rows. It is not referenced anywhere in this
build and was never touched.

## What is and is not protected

Protected:

- No credential in this build can escalate past row-level security.
- No production data is reachable from this deployment.
- No real personal data exists in the demo database — every profile is
  generated.

Not protected, and by design for a demo:

- Every route is publicly reachable; there is no session, rate limit or CSRF
  identity behind any page.
- The Guild tables are world-readable and world-writable through the
  publishable key.
- The admin surfaces listed in the table above are reachable until
  `requireAdmin()` is fixed.

## Restoring real authentication

1. `git revert` the commits touching `middleware.ts`, `lib/auth/server.ts` and
   `lib/auth/roles.ts` — the original bodies are intact in history. That
   restores the per-request `getUser()` gate, real roles, and the forced
   password-change and onboarding redirects.
2. Replace the open `demo_all` policies on the Guild tables with the
   ownership-scoped ones in `supabase/guild/0002_rls.sql`.
3. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, and
   delete the `DEMO_URL` / `DEMO_PUBLISHABLE_KEY` fallbacks in `lib/supabase.ts`
   so a missing key fails loudly instead of silently reaching the demo project.
4. Rotate the publishable key on the demo project, since it is committed here.

## Reporting

This is a student project. Open an issue on the repository.
