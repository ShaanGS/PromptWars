import type { User } from '@supabase/supabase-js'

/**
 * Roles for the demo build.
 *
 * There is no login (see middleware.ts) and no session -- lib/auth/server.ts
 * hands every request the same stand-in user. That removes the *login wall*,
 * which is what a judge-facing demo needs.
 *
 * It deliberately does NOT hand out admin. Removing a sign-in step and
 * granting every anonymous visitor the ability to delete events, edit the
 * corpus and change who has access are different decisions, and only the
 * first one was asked for. `isAdmin` therefore stays false: the admin screens
 * re-check it server-side, so they stay closed to the public demo.
 *
 * The real bodies are one `git revert` away when auth comes back.
 */
export type Role = 'admin' | 'member'

export function roleOf(user: User | null | undefined): Role {
  return user?.app_metadata?.role === 'admin' ? 'admin' : 'member'
}

/**
 * Closed. The demo user is a member, so /admin, /admin/add and
 * /admin/discovery stay unreachable even though there is no login.
 */
export function isAdmin(user?: User | null): boolean {
  return roleOf(user) === 'admin'
}

/** Demo: no admin-set password exists, so nothing is ever forced to /settings. */
export function mustChangePassword(_user?: User | null): boolean {
  return false
}

/** Demo: skip the three-screen /welcome wizard and land straight on the feed. */
export function isOnboarded(_user?: User | null): boolean {
  return true
}
