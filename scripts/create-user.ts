/**
 * Create (or re-password) an account, without sending a single email.
 *
 * The app has no sign-up page. Since 2026-08-23 the normal way to add someone
 * is /admin (which also sets the first-login flag); this script remains as
 * the terminal fallback and as the way to create the very first account
 * before `npm run admin:grant` makes it the admin.
 *
 *   npm run user:create -- someone@example.com "their-password"
 *
 * email_confirm is set so the address counts as verified immediately --
 * otherwise Supabase mails a confirmation and we are back to waiting on SMTP,
 * which is the entire reason passwords replaced magic links.
 *
 * Re-running for an existing address resets that account's password, so this
 * doubles as "they forgot it" recovery. There is no self-serve reset, because
 * a reset flow needs email.
 *
 * Wrapped in main() rather than using top-level await: tsx transforms these
 * scripts to CJS, which rejects it.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import { createClient } from '@supabase/supabase-js'

async function main() {
  assertProdWritesAllowed('user:create')
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Usage: npm run user:create -- <email> <password>')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters (Supabase rejects shorter).')
    process.exit(1)
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalised = email.trim().toLowerCase()

  const { data: created, error } = await admin.auth.admin.createUser({
    email: normalised,
    password,
    email_confirm: true,
  })

  if (!error) {
    console.log(`Created ${normalised} (${created.user?.id}). They can sign in now.`)
    return
  }

  // Supabase reports an existing address as a 422; treat that as "update the
  // password" rather than making the caller work out which case they are in.
  if (!/already|exists|registered/i.test(error.message)) {
    console.error(`Failed: ${error.message}`)
    process.exit(1)
  }

  const { data: list, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    console.error(`Account exists but could not be looked up: ${listError.message}`)
    process.exit(1)
  }

  const existing = list.users.find((u) => u.email?.toLowerCase() === normalised)
  if (!existing) {
    console.error('Account reported as existing but was not found in the user list.')
    process.exit(1)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  })

  if (updateError) {
    console.error(`Could not reset the password: ${updateError.message}`)
    process.exit(1)
  }

  console.log(`${normalised} already existed -- password reset. They can sign in now.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
