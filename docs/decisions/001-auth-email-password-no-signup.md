# 001 — Email + password, no sign-up, no email sending

> **SUPERSEDED 2026-08-25 by the Guild demo build.** Everything below describes
> the auth system this repo _had_ and is the specification for restoring it —
> none of it is true of the current build. There is no session, no login page
> that works, no `getUser()` in `middleware.ts` (it is a pass-through), and no
> service-role key for `admin:grant` or `user:create` to use. See
> [`../../SECURITY.md`](../../SECURITY.md) for the posture that replaced it and
> the three-file revert that brings this record back into force.
>
> Kept, not deleted: it is the most precise statement of the target state, and
> the "gotcha learned live" below still applies whenever auth returns.

Settled 2026-08-05 (passwords) and 2026-08-23 (admin + access control).

**Decision.** Accounts are email + password, created only by the admin —
from `/admin`, or `scripts/create-user.ts` as the terminal fallback. There
is no sign-up page, no magic links, no password-reset email, and nothing
in the product sends mail at all. The account existing IS the invite.

**Why.** Magic links were removed 2026-08-05: Supabase free-tier SMTP
allows ~1 mail/minute, so a second click 429'd and the user saw "could
not send the link" while the first mail had actually sent. Every flow
that assumes email exists inherits that failure, so none do.

**The shape that follows.**

- Roles live in `app_metadata.role` (`admin` | `member`) — verified by
  `getUser()` on every request, never decoded from a cookie locally.
- The only admin is bootstrapped by `npm run admin:grant`, at the
  terminal, on purpose: one person shares access, and that person is not
  chosen from a web form.
- Revoke = ban (reversible, saves kept), not delete. Lockout is
  immediate because the middleware calls `getUser()` per request.
- Admin-set passwords carry `must_change_password`; the middleware routes
  the user to `/settings` until they pick their own.
- Every create / reset / revoke / restore / grant writes an
  `access_audit` row (migration 0008).

**Gotcha learned live.** Supabase MERGES `app_metadata` on update —
omitting a key does not clear it; write `false` explicitly.

**Revisit when** an email provider is chosen (roadmap: digest +
self-serve reset are blocked on exactly that decision).
