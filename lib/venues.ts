/**
 * Premium Chennai venues, for ranking only.
 *
 * Shaan's rule (2026-08-24): a free event hosted at a five-star hotel goes
 * straight to the top of the feed — the venue is the signal (an organizer
 * who books the Grand Chola and charges nothing is curating the room, not
 * selling tickets). Deliberately INVISIBLE product-wise: no filter, no
 * badge, no "five-star" anywhere in the UI — hunting hotels is not the
 * product, better rooms are.
 *
 * Matching is against the free-text venue string sources give us, so each
 * entry is a pattern tolerant of suffixes ("ITC Grand Chola, a Luxury
 * Collection Hotel, Guindy") but specific enough not to catch a "Hilton's
 * Cafe".
 */
const PREMIUM_VENUES_CHENNAI: RegExp[] = [
  /itc\s+grand\s+chola/i,
  /taj\s+coromandel/i,
  /leela\s+palace/i,
  /hilton\s+chennai/i,
  /hyatt\s+regency/i,
  /park\s+hyatt/i,
  /radisson\s+blu/i,
  /crowne\s+plaza/i,
  /sheraton\s+grand/i,
  /westin\s+chennai/i,
  /le\s+royal\s+m[eé]ridien/i,
  /taj\s+club\s*house/i,
  /itc\s+chola\s+sheraton/i,
  /holiday\s+inn\s+chennai/i,
  // NOT a bare /marriott/: the first live check matched a trivia night at
  // "Courtyard by Marriott" -- the mid-tier brands (Courtyard, Fairfield)
  // are exactly what this list must not confer status on.
]

export function isPremiumVenue(venue: string | null | undefined): boolean {
  if (!venue) return false
  return PREMIUM_VENUES_CHENNAI.some((p) => p.test(venue))
}
