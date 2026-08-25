import { NextResponse } from 'next/server'

/**
 * Pass-through. There is no auth gate in this build.
 *
 * Olvable shipped with email + password accounts and this file was the gate:
 * refresh the session cookie, bounce signed-out visitors to /login, keep
 * members out of /admin, force a password change, force onboarding. For the
 * demo the whole app is open -- judges get a URL and see the product, with no
 * account to create and no credentials to hand around. Identity comes from
 * lib/demo.ts (one seeded profile) instead of from a session.
 *
 * The file and its matcher stay so the gate is one commit away: restore the
 * body from git history and the routes below are covered again exactly as
 * they were.
 */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
