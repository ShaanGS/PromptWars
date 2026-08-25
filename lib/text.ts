/** Text normalisation shared by dedupe, geo classification and rendering. */

/**
 * Decode HTML entities in plain-text fields.
 *
 * JSON-LD escapes them even though the value is not markup, so an AllEvents
 * title arrives as "Investors &amp; Founders" and renders with the entity
 * visible. React escapes on output, so this has to happen at ingest.
 */
export function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null
  const text = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

/**
 * Noise that appears in some sources' titles and not others, and so defeats
 * cross-source matching. Stripped for comparison only -- the display title is
 * always the original.
 */
const TITLE_NOISE = [
  /\bchennai\b/g,
  /\bindia\b/g,
  /\btamil\s?nadu\b/g,
  /\bonline\b/g,
  /\bvirtual\b/g,
  /\bmeetup\b/g,
  /\bwebinar\b/g,
  /#\s?\d+/g,
  /\bvol\.?\s?\d+\b/g,
  /\bedition\b/g,
  /\bep\.?\s?\d+\b/g,
  /\bseason\s?\d+\b/g,
  /\b20\d{2}\b/g,
]

/**
 * Comparison key for trigram matching.
 *
 * Note the tension this is managing: strip episode markers and two distinct
 * instances of a monthly series can match; keep them and the same event listed
 * on two sites never matches. We strip, because the locked behaviour is to
 * group visually and never auto-merge -- so a false positive costs one click,
 * while a false negative is an event silently listed twice.
 */
export function normalizeTitle(title: string): string {
  let out = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')

  for (const pattern of TITLE_NOISE) out = out.replace(pattern, ' ')

  return out
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeOrganizer(name: string | null | undefined): string | null {
  if (!name) return null
  const out = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(pvt|private|ltd|limited|inc|llp|foundation|technologies|technology)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return out || null
}

/**
 * Canonical URL for dedupe. Query strings on these sites are tracking
 * parameters, and a canonical-URL match is the single strongest duplicate
 * signal we have -- AllEvents (and other aggregators) routinely link back to the
 * original Luma listing.
 */
export function canonicalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    u.hash = ''
    u.search = ''
    u.protocol = 'https:'
    u.host = u.host.replace(/^www\./, '')
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1)
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Chennai area from the venue string. Guindy vs OMR vs Anna Nagar is twenty
 * minutes versus ninety, which decides whether an event is reachable after a
 * 4pm class. Keyword lookup, deliberately not a geocoding API.
 */
const AREAS: Array<[string, RegExp]> = [
  [
    'OMR / Sholinganallur',
    /\b(omr|sholinganallur|perungudi|thoraipakkam|navalur|siruseri|karapakkam)\b/i,
  ],
  ['Guindy / Ekkatuthangal', /\b(guindy|ekkatuthangal|ashok nagar|saidapet|k\.?k\.? nagar)\b/i],
  ['Anna Nagar', /\b(anna nagar|shanthi colony|mogappair)\b/i],
  ['T. Nagar / Nungambakkam', /\b(t\.? ?nagar|thyagaraya|nungambakkam|mahalingapuram)\b/i],
  ['Adyar / Besant Nagar', /\b(adyar|besant nagar|thiruvanmiyur|kotturpuram)\b/i],
  ['Velachery / Taramani', /\b(velachery|taramani|pallikaranai|madipakkam)\b/i],
  ['Porur / Ramapuram', /\b(porur|ramapuram|vadapalani|virugambakkam)\b/i],
  ['Ambattur / Avadi', /\b(ambattur|avadi|padi|korattur)\b/i],
  ['Central Chennai', /\b(egmore|chetpet|kilpauk|purasawalkam|royapettah|mylapore|triplicane)\b/i],
  ['Tambaram / Chromepet', /\b(tambaram|chromepet|pallavaram|selaiyur)\b/i],
]

export function inferArea(venue: string | null | undefined): string | null {
  if (!venue) return null
  for (const [area, pattern] of AREAS) {
    if (pattern.test(venue)) return area
  }
  return null
}

/**
 * Display-safe title. Organisers paste Unicode "mathematical bold" and
 * fullwidth glyphs for emphasis, which render in a fallback serif and break
 * search. NFKC folds them back to plain letters at render time.
 */
export function displayText(input: string): string {
  return input.normalize('NFKC')
}

/**
 * Segments organisers bolt onto titles that the card already states as
 * structured fact: "Pitch to ivi | Virtual | August 24, 2026, | 10:00 AM -
 * 05:00 PM" says the mode once and the date twice more than the meta line
 * below it. A segment is dropped only when the WHOLE segment is such a
 * restatement -- "Investors & Founders" stays, "Chennai" alone goes.
 */
const JUNK_SEGMENT = [
  /^(online|virtual|hybrid|offline|in[- ]?person|free|free event|free entry)$/i,
  /^(chennai|tamil ?nadu|india|coimbatore|madurai|trichy|tiruchirappalli|vellore|bengaluru|bangalore)$/i,
  // "August 24, 2026," / "24 Aug 2026" / "Sat, 29 August" -- date restated.
  /^[a-z]{0,9},?\s*\d{1,2}(st|nd|rd|th)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.?,?\s*(\d{4})?,?$/i,
  /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.?\s*\d{1,2}(st|nd|rd|th)?,?\s*(\d{4})?,?$/i,
  // "10:00 AM - 05:00 PM" / "6 PM onwards" -- time restated.
  /^\d{1,2}([:.]\d{2})?\s*(am|pm)?\s*([-–—]|to)\s*\d{1,2}([:.]\d{2})?\s*(am|pm)?,?$/i,
  /^\d{1,2}([:.]\d{2})?\s*(am|pm)(\s+onwards?)?,?$/i,
  /^\d{4},?$/,
]

/** Display title: NFKC-folded, with pipe-separated junk segments dropped. */
export function displayTitle(input: string): string {
  const text = displayText(input)
  const segments = text.split(/\s*\|\s*/)
  if (segments.length < 2) return text
  const kept = segments.filter(
    // The first segment is the name; never drop it, whatever it says.
    (seg, i) => i === 0 || !JUNK_SEGMENT.some((p) => p.test(seg.trim())),
  )
  return kept.join(' | ').trim()
}

/**
 * A short excerpt of an organiser's description for the detail page.
 *
 * We show a snippet and link out, never the full prose: the facts about an
 * event (when, where, price) are ours to list, the organiser's write-up is
 * theirs. Cuts at a sentence end if one falls in the back half of the
 * budget, else at a word boundary, and marks the cut with an ellipsis so it
 * never reads as the whole text.
 */
export function snippet(input: string | null | undefined, max = 280): string | null {
  if (!input) return null
  const text = input.replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (text.length <= max) return text

  const head = text.slice(0, max)
  const sentenceEnd = Math.max(
    head.lastIndexOf('. '),
    head.lastIndexOf('! '),
    head.lastIndexOf('? '),
  )
  if (sentenceEnd >= max * 0.5) return head.slice(0, sentenceEnd + 1) + ' …'

  const wordEnd = head.lastIndexOf(' ')
  return head.slice(0, wordEnd > 0 ? wordEnd : max).replace(/[,;:\-–—(]+$/, '') + '…'
}
