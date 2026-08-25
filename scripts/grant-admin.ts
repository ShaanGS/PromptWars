/**
 * Bootstrap (or re-grant) the admin role. The only way an admin comes into
 * existence -- there is no UI for it, by design: one person shares access,
 * and that person is chosen at the terminal, once.
 *
 *   npm run admin:grant -- you@example.com
 *
 * The account must already exist (npm run user:create). Sets
 * app_metadata.role = 'admin' and writes an audit row with actor "script".
 *
 * Wrapped in main(): tsx compiles to CJS, no top-level await.
 */
import './load-env'
import { assertProdWritesAllowed } from './guard'
import { createClient } from '@supabase/supabase-js'

async function main() {
  assertProdWritesAllowed('admin:grant')
  const [rawEmail] = process.argv.slice(2)
  if (!rawEmail) {
    console.error('Usage: npm run admin:grant -- <email>')
    process.exit(1)
  }
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
    process.exit(1)
  }
  const email = rawEmail.trim().toLowerCase()
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(error.message)
  const user = data.users.find((u) => u.email?.toLowerCase() === email)
  if (!user) {
    console.error(
      `No account for ${email}. Create it first: npm run user:create -- ${email} <password>`,
    )
    process.exit(1)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: 'admin' },
  })
  if (updateError) throw new Error(updateError.message)

  const { error: auditError } = await admin.from('access_audit').insert({
    actor_id: null,
    actor_email: 'script',
    action: 'grant_admin',
    target_id: user.id,
    target_email: email,
    detail: 'npm run admin:grant',
  })
  if (auditError) throw new Error(`Granted, but audit row failed: ${auditError.message}`)

  console.log(`${email} is now an admin. Sign out and back in if already signed in.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
