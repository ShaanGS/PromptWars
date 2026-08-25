/**
 * Geographic classification.
 *
 * Nothing is deleted here. An out-of-area event gets `status = 'filtered_geo'`
 * and stays in the table, so the "Filtered out (N)" drawer can prove nothing
 * real was thrown away. Silent discarding is the failure mode that sends
 * someone back to checking Luma by hand.
 */

export type GeoVerdict = 'active' | 'filtered_geo'

/** Chennai plus the Tamil Nadu cities within reach. */
const IN_SCOPE = [
  /\bchennai\b/i,
  /\bmadras\b/i,
  /\btamil\s?nadu\b/i,
  /\bcoimbatore\b/i,
  /\bvellore\b/i,
  /\btrichy\b/i,
  /\btiruchirappalli\b/i,
  /\bmadurai\b/i,
  /\bsalem\b/i,
  /\berode\b/i,
  /\bthanjavur\b/i,
  /\bkanchipuram\b/i,
  /\bchengalpattu\b/i,
]

const ONLINE = [/\bonline\b/i, /\bvirtual\b/i, /\bremote\b/i, /\banywhere\b/i, /\bworldwide\b/i]

/**
 * Places that are definitively NOT in scope.
 *
 * This list is what makes filtering a fact rather than a guess. Without it the
 * classifier had to filter anything it could not positively confirm, which
 * dropped a real Chennai hackathon hosted at "Freshworks" -- a venue string
 * with no geographic signal in it at all.
 */
const OUT_OF_SCOPE = [
  /\bbengaluru\b/i,
  /\bbangalore\b/i,
  /\bkarnataka\b/i,
  /\bmysore\b/i,
  /\bmangalore\b/i,
  /\bdelhi\b/i,
  /\bnoida\b/i,
  /\bgurugram\b/i,
  /\bgurgaon\b/i,
  /\bfaridabad\b/i,
  /\bmumbai\b/i,
  /\bpune\b/i,
  /\bnagpur\b/i,
  /\bmaharashtra\b/i,
  /\bnashik\b/i,
  /\bhyderabad\b/i,
  /\btelangana\b/i,
  /\bandhra\b/i,
  /\bvijayawada\b/i,
  /\bvisakhapatnam\b/i,
  /\bkolkata\b/i,
  /\bwest bengal\b/i,
  /\bahmedabad\b/i,
  /\bgujarat\b/i,
  /\bsurat\b/i,
  /\bvadodara\b/i,
  /\bjaipur\b/i,
  /\brajasthan\b/i,
  /\bjodhpur\b/i,
  /\budaipur\b/i,
  /\bindore\b/i,
  /\bbhopal\b/i,
  /\bmadhya pradesh\b/i,
  /\bgwalior\b/i,
  /\blucknow\b/i,
  /\bkanpur\b/i,
  /\buttar pradesh\b/i,
  /\bvaranasi\b/i,
  /\bchandigarh\b/i,
  /\bpunjab\b/i,
  /\bharyana\b/i,
  /\bludhiana\b/i,
  /\bkerala\b/i,
  /\bkochi\b/i,
  /\bthiruvananthapuram\b/i,
  /\bcalicut\b/i,
  /\bodisha\b/i,
  /\bbhubaneswar\b/i,
  /\bpatna\b/i,
  /\bbihar\b/i,
  /\bjharkhand\b/i,
  /\bassam\b/i,
  /\bguwahati\b/i,
  /\bdehradun\b/i,
  /\buttarakhand\b/i,
  /\bgoa\b/i,
  /\bujjain\b/i,
  /\braipur\b/i,
  /\branchi\b/i,
  /\bagra\b/i,
  /\bmeerut\b/i,
  // International hubs that show up in India-wide startup calendars. The
  // structured-country rule catches these when JSON-LD provides an address
  // object; this list is the fallback for venue strings like "Singapore".
  /\bsingapore\b/i,
  /\bdubai\b/i,
  /\babu dhabi\b/i,
  /\briyadh\b/i,
  /\bdoha\b/i,
  /\blondon\b/i,
  /\bberlin\b/i,
  /\bparis\b/i,
  /\bamsterdam\b/i,
  /\bd[uü]sseldorf\b/i,
  /\bnew york\b/i,
  /\bsan francisco\b/i,
  /\bbay area\b/i,
  /\bboston\b/i,
  /\bseattle\b/i,
  /\baustin\b/i,
  /\btoronto\b/i,
  /\bvancouver\b/i,
  /\bsydney\b/i,
  /\bmelbourne\b/i,
  /\btokyo\b/i,
  /\bseoul\b/i,
  /\bhong kong\b/i,
  /\bbangkok\b/i,
  /\bjakarta\b/i,
  /\bkuala lumpur\b/i,
  /\bdhaka\b/i,
  /\bkathmandu\b/i,
  /\bcolombo\b/i,
]

/**
 * Chennai and Tamil Nadu anchors that are not place names.
 *
 * Venue strings often name a company or campus and no city at all. These are
 * the ones worth knowing about explicitly.
 */
const LOCAL_ANCHORS = [
  /\bfreshworks\b/i,
  /\bzoho\b/i,
  /\btidel park\b/i,
  /\bolympia tech\b/i,
  /\biit ?-? ?madras\b/i,
  /\banna university\b/i,
  /\bssn\b/i,
  /\bvit\s*chennai\b/i,
  /\bsrm\b/i,
  /\bamrita.*coimbatore\b/i,
  /\bpsg\b/i,
  /\bkumaraguru\b/i,
  /\bthiagarajar\b/i,
]

/**
 * Cheap pre-gate, run on raw text BEFORE any LLM call.
 *
 * This is load-bearing for cost, not just tidiness. Extraction has to run
 * before geo classification -- the city is inside the text we have not
 * extracted yet -- and an India-wide listing site can carry thousands of
 * rows. Most of them die here for free.
 */
export function mightBeInScope(rawText: string): boolean {
  return IN_SCOPE.some((r) => r.test(rawText)) || ONLINE.some((r) => r.test(rawText))
}

export function isOnlineText(text: string | null | undefined): boolean {
  if (!text) return false
  return ONLINE.some((r) => r.test(text))
}

/**
 * Classify an event as in scope or not.
 *
 * The default is KEEP. Something is only filtered when a location is
 * positively recognised as somewhere else -- never merely because we failed to
 * recognise it as local.
 *
 * That asymmetry is deliberate. A false positive costs one line in a list a
 * user is already scanning. A false negative silently removes a real event and
 * is invisible by construction: you find out when someone mentions at a meetup
 * the thing your dashboard never showed you. The first live run dropped a real
 * Chennai hackathon held at "Freshworks" for exactly this reason.
 */
export function classifyGeo(
  input: {
    isOnline?: boolean
    city?: string | null
    /** From structured data when a source provides it. Definitive, unlike text. */
    country?: string | null
    venue?: string | null
    title?: string
    description?: string | null
  },
  opts: {
    /**
     * Flip the default for in-person listings: keep only what is positively
     * local, rather than keeping everything not positively elsewhere.
     *
     * Set for national sources (Devpost, Unstop) and nothing else. The
     * asymmetry above is right when a venue string is missing or vague
     * because the source is a Chennai listing site to begin with. Unstop is
     * not: it lists all of India, and its venue field is the organising
     * college's own name, so "unrecognised" there means Kharagpur or
     * Janakpuri far more often than it means an unlisted Chennai venue --
     * 111 in-person entries survived, and a handful were in Tamil Nadu.
     *
     * Online listings are never touched by this: an online hackathon is
     * enterable from Chennai, which is the whole point of carrying them.
     */
    requireLocal?: boolean
  } = {},
): GeoVerdict {
  if (input.isOnline) return 'active'

  // A structured country outside India settles it -- no keyword list can
  // enumerate every foreign city, and "Clay in Boston" sat in the feed
  // because Boston is not on an Indian out-of-scope list.
  if (input.country && !/^(in|ind|india|bharat)$/i.test(input.country.trim())) {
    return 'filtered_geo'
  }

  // Under requireLocal the description is not evidence of anything. It is
  // prose written by the organiser, and phrases like "register online" or
  // "open to students across India, including Chennai" were enough to keep an
  // IIT Kharagpur hackathon and a Guntur one in the list on the first run.
  // City, venue and title are the fields that state where a thing happens.
  const haystack = [input.city, input.venue, input.title]
    .concat(opts.requireLocal ? [] : [input.description])
    .filter(Boolean)
    .join(' ')

  if (!haystack.trim()) return opts.requireLocal ? 'filtered_geo' : 'active'

  // "Online" has to appear where a place is stated. Under requireLocal that
  // means city or venue only: a title like "Segue 3.0 : Global Design
  // Thinking Challenge (Online + Offline)" was enough to keep an event held
  // at Greater Noida, because the word is in its name rather than its venue.
  const placeText = opts.requireLocal
    ? [input.city, input.venue].filter(Boolean).join(' ')
    : haystack
  if (ONLINE.some((r) => r.test(placeText))) return 'active'
  if (IN_SCOPE.some((r) => r.test(haystack))) return 'active'
  if (LOCAL_ANCHORS.some((r) => r.test(haystack))) return 'active'

  // Positively somewhere else. This is the only path that filters by default.
  if (OUT_OF_SCOPE.some((r) => r.test(haystack))) return 'filtered_geo'

  // No usable signal either way. Normally kept -- see the doc comment. For a
  // national source, an in-person listing has to prove it is local.
  if (opts.requireLocal) return 'filtered_geo'
  return 'active'
}
