import { NextResponse } from 'next/server'

/**
 * Auth is deliberately disabled in this build. This file is the gate that
 * used to enforce it, kept as a pass-through so the restore is one edit.
 *
 * Olvable shipped with email + password accounts and this middleware was the
 * boundary: refresh the session cookie on every request, bounce signed-out
 * visitors to /login, keep members out of /admin, force a password change,
 * force onboarding. Guild is a judge-facing demo -- a URL, no account to
 * create, no credentials to pass around -- so the whole app is open and
 * identity comes from one seeded profile (lib/demo.ts) instead of a session.
 *
 * What that does NOT mean: dropping the gate here is not a grant of admin.
 * lib/auth/roles.ts still hands the stand-in user the `member` role, so
 * authorization stays a separate question from authentication and is decided
 * there and in the admin route guards -- never in this file. See SECURITY.md.
 *
 * To restore the gate: `git log -- middleware.ts`, restore the body from
 * before the demo commit (it refreshes the session and applies the redirects
 * above), and restore the real bodies in lib/auth/server.ts and
 * lib/auth/roles.ts. The matcher below is the one it ran on and is left
 * untouched, so the restore is a body swap and nothing else.
 *
 * The matcher stays explicit rather than being emptied out: Next treats an
 * empty matcher array as unset and falls back to `/:path*`, which would run
 * this on static assets too. The exclusions below are the minimum.
 */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
