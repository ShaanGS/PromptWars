'use server'

import { redirect } from 'next/navigation'
import { createAuthClient, getSessionUser } from '@/lib/auth/server'
import { clearMustChangePassword } from '@/lib/admin/users'
import { mustChangePassword } from '@/lib/auth/roles'

export type PasswordResult = { ok: true; message: string } | { ok: false; message: string }

/**
 * Change your own password.
 *
 * Runs on the user's own session (auth client), so it can only ever change
 * the signed-in account. Afterwards the first-login flag is cleared with the
 * service role -- app_metadata is not user-writable, which is exactly why it
 * was safe to put the flag there.
 */
export async function changePassword(
  _prev: PasswordResult | null,
  formData: FormData,
): Promise<PasswordResult> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const wasForced = mustChangePassword(user)

  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 8) return { ok: false, message: 'Use at least 8 characters.' }
  if (password !== confirm) return { ok: false, message: 'The two passwords do not match.' }

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    // Supabase's own wording for "same as the old one" etc. is fine to show.
    return { ok: false, message: error.message }
  }

  try {
    await clearMustChangePassword(user.id, user.email ?? '')
  } catch (err) {
    return {
      ok: false,
      message: `Password changed, but: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }

  // A forced change is a gate, and passing a gate should land you somewhere:
  // straight to the dashboard. Done here rather than in a client effect,
  // which raced the post-action re-render and sometimes never fired.
  if (wasForced) redirect('/')
  return { ok: true, message: 'Password updated.' }
}
