import { NextResponse, type NextRequest } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'

/**
 * Lands the magic link.
 *
 * The email's link goes through Supabase's verify endpoint, which redirects
 * here with a one-time ?code=. Exchanging it sets the session cookies. The
 * PKCE verifier lives in a cookie set when the link was requested, so the
 * link must be opened in the same browser it was requested from -- the login
 * page says as much.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const supabase = await createAuthClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=authfail', request.url))
}
