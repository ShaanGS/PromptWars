/**
 * Per-source format tables.
 *
 * Every entry is explicit and ordered. There is no generic fallback: a format
 * that isn't listed here should fail loudly and land in `normalize_error`,
 * rather than being guessed at and stored as a plausible wrong date.
 *
 * Note what is deliberately absent everywhere: `MM/dd/yyyy`. All of these
 * sources are Indian and write day-first. Including the US ordering would
 * make "03/04/2026" ambiguous, and ambiguity here is indistinguishable from
 * correctness until someone misses an event.
 */

/** Devpost: "Jun 15 - Jul 31, 2026" -- year appears only on the end. */
export const DEVPOST_FORMATS = [
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'MMM d yyyy',
  'MMMM d yyyy',
  'MMM d',
  'MMMM d',
]

/** Knowafest: "12 Aug 2026". */
export const KNOWAFEST_FORMATS = ['d MMM yyyy', 'd MMMM yyyy', 'd MMM', 'd MMMM']

/**
 * Day-first formats: "12th - 13th August 2026" and "03/04/2026" (DD/MM).
 * First written for ConferenceAlerts (source removed in 3.10); kept because
 * the DD/MM rule and range-borrowing are generic, tested, and the next
 * Indian listing site will need them.
 */
export const DAY_FIRST_FORMATS = [
  'd MMMM yyyy',
  'd MMM yyyy',
  'dd/MM/yyyy',
  'd/M/yyyy',
  'dd-MM-yyyy',
  'd MMMM',
  'd MMM',
]

/** TiE Chennai renders long dates, sometimes with a time. */
export const TIE_FORMATS = ['MMMM d, yyyy h:mm a', 'MMMM d, yyyy', 'MMM d, yyyy', 'd MMMM yyyy']

/** ocgroups.dev htmx fragments. */
export const OCGROUPS_FORMATS = ['MMM d, yyyy h:mm a', 'MMM d, yyyy', 'MMMM d, yyyy', 'd MMM yyyy']
