/**
 * Source registry. Checked into git and synced into the `sources` table by
 * `npm run seed`.
 *
 * Split of responsibility, stated once so it never becomes a question:
 *   - CODE (the Connector interface) owns structural facts: how to fetch,
 *     how to parse, whether the LLM is needed.
 *   - THIS FILE owns operational defaults: enabled, crawl delay, user agent,
 *     audience.
 *   - The DB row is the runtime value and can be tweaked without a deploy;
 *     re-running the seed resets it to what's here.
 */

export interface SourceConfig {
  id: string
  displayName: string
  enabled: boolean
  /**
   * What shape the source's listings are.
   *
   *   'events'    -- something happens at a time and place. `starts_at` is the
   *                  date that matters, and every dated surface filters on it.
   *   'deadlines' -- a hackathon or competition you enter before a cutoff.
   *                  `date_kind` is 'deadline' and `starts_at` is either the
   *                  submission window's opening (Devpost) or the cutoff
   *                  itself (Unstop) -- so an entry that is open RIGHT NOW has
   *                  a start in the past and is invisible to a
   *                  `starts_at >= now` filter. These live on /hackathons,
   *                  ordered by `registration_deadline`, and are kept out of
   *                  the feed, All events and the calendar's Everything scope:
   *                  they are national and mostly online, and the feed is the
   *                  local triage surface. Anything you save still appears
   *                  everywhere, because Saved and Mine never filter by source.
   *
   * Defaults to 'events' when absent.
   */
  kind?: 'events' | 'deadlines'
  /**
   * True keeps the source out of the feed's default view: its events appear
   * on the feed only when its chip is the active source filter, and always on
   * All events and the calendar. A softer version of the 'deadlines' split.
   *
   * Two reasons a source earns it, both about protecting the shortlist:
   *  - VOLUME: ~100 college fests landing at once would bury the ten
   *    listings the feed exists to surface (knowafest).
   *  - SIGNAL: the source is mostly noise and the scorer cannot tell,
   *    because the noise is written in the scorer's own vocabulary
   *    (allevents -- see its entry).
   */
  feedOptIn?: boolean
  /**
   * Zero listings is a normal run, not a broken scraper: the source lists
   * only upcoming events and sleeps between them (Bevy chapters).
   */
  sparse?: boolean
  crawlDelayMs: number
  userAgent: string
  /**
   * Who is typically in the room. Relevance scores *topic*; this captures
   * whether a client, a hire or a peer will be there -- which is the actual
   * question for someone scaling an agency. Overridden per-event only for
   * sources that already pay for an LLM call.
   */
  defaultAudience: string[]
}

/**
 * Honest identification, with a contact URL. Used everywhere, without
 * exception: a source that 403s an honest agent is a source we do not have.
 * (ConferenceAlerts was that source; its browser-impersonating path was
 * removed in 3.10 rather than left loaded.)
 *
 * The contact URL is the live app, not the GitHub repo: the repo is
 * private, so a site owner checking who is crawling them would hit a 404 —
 * the one thing a contact URL must not do. Update it if the domain changes.
 * (olvable.vercel.app adopted 2026-08-24; the old kairoevents-beta URL
 * stays attached on Vercel, so both resolve.)
 */
export const HONEST_UA = 'olvable/0.1 (personal event aggregator; +https://olvable.vercel.app)'

export const SOURCES: SourceConfig[] = [
  {
    id: 'devfolio',
    displayName: 'Devfolio',
    enabled: true, // 3.8 -- the best-shaped hackathon source we have
    kind: 'deadlines',
    // robots.txt is `Disallow:` with nothing after it -- fully open, and it
    // names no bots. The search endpoint is public and unauthenticated.
    crawlDelayMs: 1_000,
    userAgent: HONEST_UA,
    defaultAudience: ['students', 'devs', 'early builders'],
  },
  {
    id: 'devpost',
    displayName: 'Devpost',
    enabled: true, // 3.6 -- the Hackathons section
    kind: 'deadlines',
    // robots.txt is fully open and does not disallow /api/. It does block
    // GPTBot, CCBot and anthropic-ai by name, so we must not present as one.
    crawlDelayMs: 1_000,
    userAgent: HONEST_UA,
    defaultAudience: ['students', 'devs', 'early builders'],
  },
  {
    id: 'unstop',
    displayName: 'Unstop',
    enabled: true, // 3.6 -- the Hackathons section
    kind: 'deadlines',
    // robots.txt explicitly allows /api/public/*.
    crawlDelayMs: 1_000,
    userAgent: HONEST_UA,
    defaultAudience: ['students', 'devs', 'early builders'],
  },
  {
    id: 'allevents',
    displayName: 'AllEvents',
    enabled: true,
    // Feed-opt-in since 2026-08-24 (Shaan: "mostly crappy"). The numbers
    // agreed: 75 of 95 upcoming listings already scored under the feed
    // floor, and the few that cleared it were marketing copy gaming the
    // scorer -- a Dubai promo with a QR code scored 90. Keyword-rich ad
    // copy is indistinguishable from a real event to a keyword scorer, so
    // the fix is the source, not the threshold. Still fully present on
    // All events, the calendar and search; the chip brings it back.
    feedOptIn: true,
    // robots.txt sets ClaudeBot: Crawl-delay 10. We are not ClaudeBot, so the
    // `*` group applies -- but honouring the strictest published delay is the
    // right call, and it is why this source needs a resumable cursor.
    crawlDelayMs: 10_000,
    userAgent: HONEST_UA,
    defaultAudience: ['general public'],
  },
  {
    id: 'luma',
    displayName: 'Luma',
    enabled: true,
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['founders', 'devs', 'early builders'],
  },
  {
    id: 'knowafest',
    displayName: 'Knowafest',
    enabled: true, // 4.5 -- first of the Phase 4 trio
    // ~100 student fests per sweep; opt-in so they don't flood the feed.
    feedOptIn: true,
    // robots.txt has zero disallows -- the most permissive of the set.
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['students'],
  },
  {
    id: 'gdg',
    displayName: 'GDG Chennai',
    enabled: true, // Bevy platform; robots crawl-delay 2 honoured below
    sparse: true,
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['devs', 'students'],
  },
  {
    id: 'figma',
    displayName: 'Friends of Figma',
    enabled: true, // Bevy platform, Chennai chapter
    sparse: true,
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['designers', 'devs'],
  },
  {
    id: 'mulesoft',
    displayName: 'MuleSoft Meetups',
    enabled: true, // Bevy platform, Chennai chapter
    sparse: true,
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['devs', 'corporate'],
  },
  {
    id: 'eventbrite',
    displayName: 'Eventbrite',
    // Shipped enableable-but-off (Shaan, 2026-08-24). robots.txt allows the
    // /d/ browse pages for `*`; the internal search API is disallowed and
    // the connector never touches it. When flipping this on, add
    // `eventbrite` to the ingest.yml loop too.
    enabled: false,
    crawlDelayMs: 3_000,
    userAgent: HONEST_UA,
    defaultAudience: ['general public'],
  },
  {
    id: 'manual',
    displayName: 'Hand-picked',
    enabled: true, // events pasted in by the admin (/admin/add) — no scraper
    crawlDelayMs: 0,
    userAgent: HONEST_UA,
    defaultAudience: [],
  },
  {
    id: 'ocgroups',
    displayName: 'Open Community Groups',
    enabled: false, // Phase 4
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['devs', 'CTOs'],
  },
  {
    id: 'tie',
    displayName: 'TiE Chennai',
    enabled: false, // Phase 4
    crawlDelayMs: 2_000,
    userAgent: HONEST_UA,
    defaultAudience: ['founders', 'investors', 'corporate'],
  },
]

export const SOURCES_BY_ID = new Map(SOURCES.map((s) => [s.id, s]))

/** Sources whose listings are entry deadlines rather than dated events. */
export const DEADLINE_SOURCE_IDS = SOURCES.filter((s) => s.kind === 'deadlines').map((s) => s.id)

/** Sources the feed shows only when their chip is explicitly selected. */
export const FEED_OPT_IN_SOURCE_IDS = SOURCES.filter((s) => s.feedOptIn).map((s) => s.id)
