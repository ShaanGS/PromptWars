import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase access, shared by the Next.js app and the ingestion
 * scripts.
 *
 * Deliberately NOT marked `server-only`: that package throws unless it is
 * resolved under Node's `react-server` condition, which the tsx-run scripts
 * are not. The guard lives on lib/queries.ts instead -- the app-only module a
 * client component might plausibly import by accident. Scripts reach this
 * factory directly and never touch queries.ts.
 *
 * Two rules this file exists to enforce:
 *
 * 1. Service role only, and never a NEXT_PUBLIC_ variable. Every table has RLS
 *    on with zero policies, so the anon key can read nothing -- but the stock
 *    Supabase + Next.js pattern ships the anon key in the JS bundle, and we
 *    want no ambiguity about which key the app uses.
 *
 * 2. Never a module-scope client. Serverless instances are reused across
 *    requests, and a shared client leaks state between them. Construct inside
 *    the request handler, every time.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. ' +
        'Copy .env.example to .env.local and fill them in.',
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'chennai-events' } },
  })
}
