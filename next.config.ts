import type { NextConfig } from 'next'

/**
 * Security headers.
 *
 * Vercel already sends HSTS, so this covers what it does not. Deliberately
 * stops short of a full Content-Security-Policy: a strict script-src needs
 * per-request nonces threaded through the app, and shipping a broken CSP the
 * evening friends first sign in is worse than shipping none. frame-ancestors
 * is the one CSP directive that is both worth having immediately and cannot
 * break a page that was never meant to be framed.
 */
const securityHeaders = [
  // Clickjacking. frame-ancestors is the modern control; X-Frame-Options is
  // kept for older browsers that ignore it.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stops a text/plain response being sniffed into a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Event pages link out to sources; do not hand them our full URL.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing here needs hardware. Deny by default.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

const nextConfig: NextConfig = {
  // Minor, but free: no reason to advertise the framework in every response.
  poweredByHeader: false,
  // The OG image reads the Inter TTF off disk at request time; without this
  // the serverless bundle ships without the file and the route 500s in prod.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./brand/fonts/*.ttf'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
