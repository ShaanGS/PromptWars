import { NextResponse, type NextRequest } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'

/** POST-only: sign-out mutates state, and GETs get prefetched. */
export async function POST(request: NextRequest) {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
