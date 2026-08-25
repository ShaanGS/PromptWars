/**
 * Discovery sweep queries. Config in git, like sources (decision 009).
 *
 * These are the Perplexity-style queries that found AMA CXO Summit, Kovaion
 * Connect and DevSparks when our connectors could not — run weekly through
 * Google's Custom Search JSON API (their index, their API terms; LinkedIn's
 * servers are never touched, its public posts are simply in the index).
 *
 * Budget: the free tier is 100 queries/day; this list must stay under ~30
 * so a manual re-run the same day cannot exhaust it.
 */

const YEAR = new Date().getFullYear()

/** Venue-anchored: what is happening at the rooms that matter. */
const VENUE_QUERIES = [
  'ITC Grand Chola',
  'Taj Coromandel',
  'The Leela Palace Chennai',
  'Hyatt Regency Chennai',
  'Hilton Chennai',
  'Sheraton Grand Chennai',
].map((venue) => `"${venue}" (summit OR conference OR meetup OR convention) ${YEAR}`)

/** Theme-anchored: the kinds of rooms, wherever they are. */
const THEME_QUERIES = [
  `Chennai CXO summit ${YEAR}`,
  `Chennai AI conference ${YEAR}`,
  `Chennai developer conference ${YEAR}`,
  `Chennai startup summit ${YEAR}`,
  `Chennai deep tech event ${YEAR}`,
]

/** LinkedIn posts, via Google's index of them — never LinkedIn itself. */
const LINKEDIN_QUERIES = [
  `site:linkedin.com/posts Chennai summit "ITC Grand Chola"`,
  `site:linkedin.com/posts Chennai conference ${YEAR} register`,
  `site:linkedin.com/posts Chennai "Hyatt Regency" event`,
]

export const DISCOVERY_QUERIES = [...VENUE_QUERIES, ...THEME_QUERIES, ...LINKEDIN_QUERIES]

/**
 * Domains that cannot be leads: our own connectors already cover them, so a
 * hit here is a duplicate of what ingestion sees, not a discovery.
 */
export const COVERED_DOMAINS = [
  'lu.ma',
  'luma.com',
  'allevents.in',
  'devfolio.co',
  'devpost.com',
  'unstop.com',
  'knowafest.com',
]
