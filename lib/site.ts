/**
 * The canonical origin, for absolute URLs in metadata and share links.
 *
 * SITE_URL is set per environment (.env.local, Vercel). On Vercel previews
 * it may be absent, so fall through to the deployment host; localhost is the
 * last resort so the dev server still produces well-formed metadata.
 */
export function siteOrigin(): string {
  const explicit = process.env.SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}
