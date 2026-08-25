import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/site'

/**
 * Only the public share pages may be crawled. Everything else redirects to
 * login, and without this a crawler would index a hundred "Olvable – Sign
 * in" pages under event-looking URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/e/'], disallow: ['/'] }],
    host: siteOrigin(),
  }
}
