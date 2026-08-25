import { createHash } from 'node:crypto'

/**
 * The interest profile lives in git, not the database.
 *
 * The alternative -- a jsonb column edited by hand in the SQL editor -- means
 * changing the profile without updating its hash, after which cached scores
 * never invalidate. Silently, forever. Here the hash is computed from the
 * content, so the two cannot drift.
 */
export interface InterestProfile {
  /** Ranked highest. Not a filter -- low scorers still appear, further down. */
  priorityTopics: string[]
  /** Cheap deterministic hits, checked before any LLM call is considered. */
  strongKeywords: string[]
  /** Cheap deterministic misses. Most of an aggregator's noise dies here. */
  negativeKeywords: string[]
  /** Free-text context handed to the scoring model. */
  about: string
}

export const INTEREST_PROFILE: InterestProfile = {
  priorityTopics: ['tech', 'AI', 'GTM', 'startup', 'corporate networking'],

  strongKeywords: [
    'hackathon',
    'ai',
    'artificial intelligence',
    'machine learning',
    'llm',
    'startup',
    'founder',
    'founders',
    'entrepreneur',
    'pitch',
    'demo day',
    'gtm',
    'go-to-market',
    'growth',
    'saas',
    'product',
    'developer',
    'devs',
    'engineering',
    'open source',
    'web3',
    'networking',
    'meetup',
    'summit',
    'conclave',
    'incubator',
    'accelerator',
    'venture',
    'vc',
    'funding',
    'angel',
    'investor',
  ],

  // AllEvents' Chennai pages are dominated by consumer entertainment --
  // concerts, marathons, comedy nights, saree expos. Killing these
  // deterministically keeps them out of the feed AND keeps the free-tier LLM
  // budget viable, since they never reach the model at all.
  negativeKeywords: [
    // Consumer entertainment
    'concert',
    'singalong',
    'sing-along',
    'live in concert',
    'music festival',
    'stand up',
    'standup',
    'comedy',
    'open mic',
    'karaoke',
    'dj night',
    'movie',
    'film screening',
    'theatre play',
    'drama',
    'dance show',
    'kpop',
    'k-pop',
    'bollywood',
    'tribute',
    // Sport and fitness
    'marathon',
    'unity run',
    'mile run',
    'cyclothon',
    'walkathon',
    'trek',
    'cricket',
    'football match',
    'tnpl',
    'tournament',
    'sports meet',
    'zumba',
    'yoga retreat',
    'weight loss',
    'fitness challenge',
    'aerobics',
    // Retail and lifestyle expos
    'saree',
    'silk expo',
    'jewellery',
    'handloom',
    'craft mela',
    'flea market',
    'wedding',
    'bridal',
    'matrimony',
    'astrology',
    'numerology',
    'astrolog',
    'food festival',
    'pet show',
    'painting workshop',
    'pottery',
    // Clinical and academic-only
    'nursing',
    'dental',
    'ayurveda',
    'homeopathy',
    'physiotherapy',
    'gynaec',
    'orthopaedic',
    'ophthalmolog',
    'radiolog',
    'cardiolog',
    'agriculture',
    'horticulture',
    'veterinary',
  ],

  about: [
    'Second-year college student in Chennai, India.',
    'Runs a web development agency and is actively trying to scale it.',
    'Attends builder communities, startup meetups, hackathons and networking events.',
    'Values events where founders, CTOs, investors or serious builders will be present,',
    'both for agency leads and for hiring. Student-only college fests are lower value',
    'unless the technical content is strong.',
  ].join(' '),
}

/**
 * Stable hash of the profile. Changing any field above changes this, which
 * invalidates every cached relevance score on the next scoring run.
 */
export const PROFILE_HASH = createHash('sha256')
  .update(JSON.stringify(INTEREST_PROFILE))
  .digest('hex')
  .slice(0, 16)

/** Bump when the scoring *prompt* or rubric changes, independently of the profile. */
export const SCORING_VERSION = 3

/** Bump when an extraction prompt changes, to replay stored raw payloads. */
export const NORMALIZER_VERSION = 1
