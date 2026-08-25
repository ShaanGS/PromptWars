'use server'

import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/auth/server'

/**
 * Email + password sign-in.
 *
 * This replaced magic links, which were pleasant in theory and unusable in
 * practice: Supabase's built-in SMTP allows roughly one mail a minute on the
 * free tier, so every impatient second click returned a 429 and the person
 * trying to sign in saw "could not send the link".
 *
 * There is no sign-up path on purpose. Accounts are created out of band with
 * /admin (or scripts/create-user.ts), which means the account existing IS the
 * invite. (An invited_emails allowlist once stopped signInWithOtp from
 * registering strangers; dropped in 3.10, migration 0012.) Nothing here can
 * mint an account, so a leaked URL is still just a login screen.
 */
export async function signIn(formData: FormData) {
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  const password = typeof rawPassword === 'string' ? rawPassword : ''

  if (!email || !password) {
    redirect('/login?error=invalid')
  }

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Deliberately one message for both "no such account" and "wrong
    // password": the distinction is only useful to someone guessing.
    redirect('/login?error=badcreds')
  }

  redirect('/')
}
