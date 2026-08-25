import 'server-only'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import type { User } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase'
import { roleOf, type Role } from '@/lib/auth/roles'

/**
 * Everything the admin screen can do to an account, in one place.
 *
 * All of it runs on the service role, and none of it checks who is calling:
 * that is the caller's job (requireAdmin() in the action). Keeping the two
 * apart keeps this testable and keeps the gate in exactly one place.
 *
 * Revoke is a BAN, not a delete. Verified 2026-08-23 against the live auth
 * server: once a user is banned, getUser() on their existing access token
 * fails with "User is banned" -- and the middleware calls getUser() on every
 * request -- so the lockout is immediate, not at next token refresh. A ban
 * is also reversible, and it keeps their saves. Delete is not offered.
 */

export type AccountRow = {
  id: string
  email: string
  role: Role
  createdAt: string
  lastSignInAt: string | null
  /** Pre-rendered on the server so the client never formats "N seconds
   *  ago" itself and hydrates against a different second. */
  lastSignInLabel: string
  createdLabel: string
  revoked: boolean
  mustChangePassword: boolean
}

export type AuditRow = {
  id: number
  at: string
  actorEmail: string
  action: string
  targetEmail: string
  detail: string | null
}

export type Actor = { id: string | null; email: string }

type AuditAction =
  'create' | 'reset_password' | 'revoke' | 'restore' | 'grant_admin' | 'password_changed'

// The admin API returns banned_until on the wire; the shared User type omits it.
type AdminUser = User & { banned_until?: string | null }

function isBanned(u: AdminUser): boolean {
  return !!u.banned_until && new Date(u.banned_until).getTime() > Date.now()
}

function toRow(u: AdminUser): AccountRow {
  return {
    id: u.id,
    email: u.email ?? '',
    role: roleOf(u),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    lastSignInLabel: u.last_sign_in_at
      ? `signed in ${DateTime.fromISO(u.last_sign_in_at).toRelative() ?? ''}`
      : 'never signed in',
    createdLabel: DateTime.fromISO(u.created_at).toFormat('d LLL yyyy'),
    revoked: isBanned(u),
    mustChangePassword: u.app_metadata?.must_change_password === true,
  }
}

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** 16 chars, no ambiguous glyphs (0/O, 1/l/I) -- it gets read aloud. */
export function generatePassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(16)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

async function allUsers(): Promise<AdminUser[]> {
  const db = createServiceClient()
  // perPage caps at 1000; we are a long way from paginating.
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(error.message)
  return data.users as AdminUser[]
}

export async function listAccounts(): Promise<AccountRow[]> {
  return (await allUsers()).map(toRow).sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
    return a.email.localeCompare(b.email)
  })
}

export async function findByEmail(email: string): Promise<AdminUser | null> {
  const target = normaliseEmail(email)
  return (await allUsers()).find((u) => u.email?.toLowerCase() === target) ?? null
}

export async function getAccount(id: string): Promise<AdminUser | null> {
  const db = createServiceClient()
  const { data, error } = await db.auth.admin.getUserById(id)
  if (error) return null
  return data.user as AdminUser
}

export async function writeAudit(
  actor: Actor,
  action: AuditAction,
  target: { id: string | null; email: string },
  detail?: string,
): Promise<void> {
  const db = createServiceClient()
  const { error } = await db.from('access_audit').insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target_id: target.id,
    target_email: target.email,
    detail: detail ?? null,
  })
  // The action already happened; losing the trail silently is worse than a
  // visible error.
  if (error) throw new Error(`Done, but the audit row failed: ${error.message}`)
}

export async function listAudit(limit = 50): Promise<AuditRow[]> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('access_audit')
    .select('id, at, actor_email, action, target_email, detail')
    .order('at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id as number,
    at: r.at as string,
    actorEmail: r.actor_email as string,
    action: r.action as string,
    targetEmail: r.target_email as string,
    detail: (r.detail as string | null) ?? null,
  }))
}

/**
 * Create a member with a password the admin hands over out of band. No mail
 * is ever sent (email_confirm) -- which is the whole reason this exists.
 */
export async function createMember(
  actor: Actor,
  email: string,
  password: string,
): Promise<{ id: string }> {
  const db = createServiceClient()
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'member', must_change_password: true },
  })
  if (error) throw new Error(error.message)
  const id = data.user.id
  await writeAudit(actor, 'create', { id, email })
  return { id }
}

export async function resetPassword(actor: Actor, userId: string, password: string): Promise<void> {
  const db = createServiceClient()
  const user = await getAccount(userId)
  if (!user) throw new Error('No such account.')
  const { error } = await db.auth.admin.updateUserById(userId, {
    password,
    app_metadata: { ...user.app_metadata, must_change_password: true },
  })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'reset_password', { id: userId, email: user.email ?? '' })
}

export async function revokeAccess(actor: Actor, userId: string): Promise<void> {
  const db = createServiceClient()
  const user = await getAccount(userId)
  if (!user) throw new Error('No such account.')
  if (roleOf(user) === 'admin') throw new Error('An admin cannot be revoked from here.')
  // ~100 years. Supabase has no "forever"; this is the idiom.
  const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'revoke', { id: userId, email: user.email ?? '' })
}

export async function restoreAccess(actor: Actor, userId: string): Promise<void> {
  const db = createServiceClient()
  const user = await getAccount(userId)
  if (!user) throw new Error('No such account.')
  const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'restore', { id: userId, email: user.email ?? '' })
}

/** Called after a user sets their own password: clears the first-login flag. */
export async function clearMustChangePassword(userId: string, email: string): Promise<void> {
  const db = createServiceClient()
  // app_metadata is MERGED by the auth server, not replaced -- omitting the
  // key leaves it set. Found the hard way: the flag never cleared and the
  // member was bounced back to /settings forever. Write false explicitly.
  const { error } = await db.auth.admin.updateUserById(userId, {
    app_metadata: { must_change_password: false },
  })
  if (error) throw new Error(error.message)
  await writeAudit({ id: userId, email }, 'password_changed', { id: userId, email })
}
