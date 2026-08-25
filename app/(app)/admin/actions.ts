'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/server'
import {
  createMember,
  findByEmail,
  generatePassword,
  normaliseEmail,
  resetPassword,
  restoreAccess,
  revokeAccess,
} from '@/lib/admin/users'

/**
 * Admin actions. Each one re-verifies the caller is an admin from the
 * session -- never from a hidden field -- and then delegates.
 *
 * Results carry the one-time password back to the screen when one was set,
 * because that is the only moment it is ever visible: it is not stored
 * anywhere we can read it back.
 */
export type ActionResult =
  { ok: true; message: string; password?: string; email?: string } | { ok: false; message: string }

function fail(err: unknown): ActionResult {
  return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' }
}

function readPassword(formData: FormData): string {
  const raw = formData.get('password')
  const typed = typeof raw === 'string' ? raw.trim() : ''
  return typed || generatePassword()
}

export async function createAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin()
  const rawEmail = formData.get('email')
  const email = typeof rawEmail === 'string' ? normaliseEmail(rawEmail) : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'That does not look like an email address.' }
  }
  const password = readPassword(formData)
  if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }

  try {
    if (await findByEmail(email)) {
      return {
        ok: false,
        message: `${email} already has an account. Reset their password instead.`,
      }
    }
    await createMember({ id: admin.id, email: admin.email ?? '' }, email, password)
  } catch (err) {
    return fail(err)
  }
  revalidatePath('/admin')
  return { ok: true, message: `Account created for ${email}.`, password, email }
}

export async function resetAccountPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = readPassword(formData)
  if (!userId) return { ok: false, message: 'Missing account.' }
  if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters.' }
  try {
    await resetPassword({ id: admin.id, email: admin.email ?? '' }, userId, password)
  } catch (err) {
    return fail(err)
  }
  revalidatePath('/admin')
  return { ok: true, message: `Password reset for ${email}.`, password, email }
}

export async function revokeAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  const email = String(formData.get('email') ?? '')
  if (!userId) return { ok: false, message: 'Missing account.' }
  if (userId === admin.id) return { ok: false, message: 'You cannot revoke yourself.' }
  try {
    await revokeAccess({ id: admin.id, email: admin.email ?? '' }, userId)
  } catch (err) {
    return fail(err)
  }
  revalidatePath('/admin')
  return { ok: true, message: `${email} is signed out and locked out.` }
}

export async function restoreAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin()
  const userId = String(formData.get('userId') ?? '')
  const email = String(formData.get('email') ?? '')
  if (!userId) return { ok: false, message: 'Missing account.' }
  try {
    await restoreAccess({ id: admin.id, email: admin.email ?? '' }, userId)
  } catch (err) {
    return fail(err)
  }
  revalidatePath('/admin')
  return { ok: true, message: `${email} can sign in again.` }
}
