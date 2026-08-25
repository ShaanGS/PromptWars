/**
 * Luma calendars to follow.
 *
 * Luma has no Chennai discover page -- only Bengaluru, Mumbai and New Delhi
 * are discover cities -- and its public API is Plus-gated and scoped to
 * calendars you already own. So this list is curated by hand, and it is the
 * file to edit whenever someone mentions a calendar at an event.
 *
 * Three accepted forms:
 *   'chennai-react'          vanity slug
 *   'cal-uaOoiMOMK1GBj8u'    raw calendar id, for hosts with no vanity slug
 *   'user/CodeonJVM'         personal calendar
 *
 * Every entry below was verified: the page returns 200, exposes a cal- id, and
 * its feed contains real Tamil Nadu events. Verify additions the same way:
 *
 *   npm run luma:check -- <slug>
 *
 * Counts in comments are past-event volume at time of adding -- an activity
 * signal, since small community calendars sit empty between editions.
 */

/** Chennai and Tamil Nadu native. Highest signal-to-noise. */
const TIER_1_LOCAL = [
  'chennai-react', // Chennai React -- 16 TN
  'Nammaflutter', // Namma Flutter -- 10 TN
  'digitaldreamersden', // Digital Dreamers Den -- 9 TN
  'chennaidatacircle', // Chennai Data Circle, AI Day @ Ford -- 7 TN
  'indehub', // IndeHub, indie iOS/Android -- 7 TN
  'build2learn', // Build2Learn builder Saturdays -- 7 TN
  'codesapiens', // CodeSapiens -- 6 TN
  'gdgchennai', // GDG Chennai -- 5 TN, Google IO Extended
  'swiftchennai', // Swift Chennai -- 4 TN
  'azureusergroup', // Azure User Group Coimbatore -- 4 TN
  'null.chennai', // Null Chennai, security -- 3 TN
  'cursor-chennai-india', // Cursor Chennai -- 3 TN
  'faithtech-chennai', // FaithTech Chennai -- 3 TN
  'disu', // Discover U, founder workshops -- 3 TN
  'laravel-chennai-community', // Laravel Chennai -- 2 TN
  'gencircle', // Gencircle Coimbatore -- 1 TN
]

/**
 * Active Chennai hosts that publish from an unslugged calendar. These would be
 * invisible to a slug-only resolver, which is why the connector accepts raw
 * cal- ids and user paths.
 */
// Verified 2026-07-25. Note that lu.ma/user/<name> profile pages do NOT expose
// a cal- id, so hosts publishing only that way cannot be followed directly --
// Code On JVM, E-Cell IIT Madras and Cultiv8 were dropped for that reason.
// Their events still reach us via the CommunityMeetups aggregator.
const TIER_1_UNSLUGGED = [
  'cal-uaOoiMOMK1GBj8u', // From-Dev-to-Ops, DevOps Chennai -- 11 TN
  'cal-afeMLC0xVWv3CKv', // ProdWrks founder/product panels -- 6 TN
  'cal-DaS2FGp1bxrm9B4', // AI Geeks Chennai -- 4 TN
  'cal-nDFbmVttl9snfQR', // Talentship Events -- all TN
  'cal-s2fzOhHGqsmYeR2', // Chennai Web Engineering -- 1 TN
]

/** India-wide calendars that run Chennai editions often enough to be worth it. */
const TIER_2_NATIONAL = [
  'pi42exchange', // 35 TN
  'Grabchai', // GrabChai, monthly Chennai edition -- 30 TN
  'theshapeofworkbyspringworks', // HR/people-ops, 3 upcoming Chennai -- 22 TN
  'Team1India', // 15 TN
  'bitshala', // Bitcoin dev education -- 12 TN
  'isbivi', // ISB pitch days -- 11 TN
  'capx-collective', // AI + Web3, Chennai & Vellore -- 8 TN
  'icphub_IN', // 7 TN
  'GTMDialogues', // B2B SaaS GTM mixers -- 6 TN
  'theproductfolks', // Product management -- 5 TN
  'HRkatalyst', // 4 TN
  'digitalocean', // Kubernetes/cloud Chennai -- 3 TN
  'claylive', // GTM/RevOps -- 3 TN
  'deeptech-dialogues', // DeepTech Open Mic at IIT-M -- 1 TN
]

/**
 * Aggregators. CommunityMeetups alone carries 114 Tamil Nadu events and
 * cross-posts from ~80 host calendars -- most of Tier 1 was found through it.
 */
const TIER_3_AGGREGATORS = [
  'CommunityMeetups',
  'MeetUpsinIndia',
  // Luma's own Chennai city page. No vanity slug and client-rendered, but the
  // ICS feed works fine.
  'cal-8ggsp0BGeKOiXCk',
]

export const LUMA_CALENDARS: string[] = [
  ...TIER_1_LOCAL,
  ...TIER_1_UNSLUGGED,
  ...TIER_2_NATIONAL,
  ...TIER_3_AGGREGATORS,
]
