import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

/**
 * Auth, stubbed out for the demo build.
 *
 * There is no login (see middleware.ts): judges open a URL and the whole app
 * is theirs. Rather than tear `getSessionUser()` out of the twenty-odd pages
 * and actions that call it, this module keeps the same surface and hands back
 * one stable, always-present user. Every `if (!user) redirect('/login')` in
 * the app therefore falls through, and every screen renders signed-in.
 *
 * Identity for the Guild half of the product does NOT come from here -- it
 * comes from the seeded profile in lib/demo.ts. This user exists only so the
 * Olvable shell (sidebar email, saved events, interests) keeps working.
 */

/**
 * The user id Olvable's own tables key on.
 *
 * `user_interests.user_id` and `user_event_actions.user_id` are foreign keys
 * into `auth.users`, so reads with an id that has no row come back empty
 * (harmless) but writes fail (saving an event, finishing onboarding). Point
 * DEMO_USER_ID at a real row in auth.users and those write paths work again;
 * left unset, the demo simply starts with nothing saved.
 */
const DEMO_USER_ID = process.env.DEMO_USER_ID ?? '00000000-0000-4000-8000-000000000001'

const DEMO_USER: User = {
  id: DEMO_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@olvable.app',
  // A member, not an admin: removing the login wall is not the same as
  // handing every visitor the corpus-editing screens. See lib/auth/roles.ts.
  app_metadata: { provider: 'demo', role: 'member', onboarded: true },
  user_metadata: {},
  // Fixed, not Date.now(): this object is compared and rendered, and a value
  // that changes per request would make output non-deterministic.
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  identities: [],
  is_anonymous: false,
}

/**
 * Kept only so the vestigial /login, /auth/callback and /auth/signout routes
 * still compile. Nothing in the demo flow reaches them.
 *
 * Missing env vars no longer throw: a demo deploy may carry no anon key at
 * all, and a stray POST to /auth/signout should not 500 the app. The client
 * is built against a dead origin instead, so sign-out is a no-op redirect.
 */
export async function createAuthClient() {
  const cookieStore = await cookies()
  const url = process.env.SUPABASE_URL ?? 'http://localhost:54321'
  const anonKey = process.env.SUPABASE_ANON_KEY ?? 'demo-no-auth'
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server components cannot write cookies. Documented pattern.
        }
      },
    },
  })
}

/** Always the demo user. Async to keep every existing `await` call site valid. */
export async function getSessionUser(): Promise<User | null> {
  return DEMO_USER
}

/** Same user, no gate -- the admin screens are part of the demo. */
export async function requireAdmin(): Promise<User> {
  return DEMO_USER
}
