import type { PartialEvent } from '@/lib/connectors/types'

/**
 * Quality gates, evaluated before any event is written.
 *
 * The failure everyone designs for is a scraper returning zero rows. The
 * failure that actually happens is a changed selector returning forty rows
 * with `title: ""` or `title: "Read more"` and no dates -- which passes a
 * count check and quietly poisons the dashboard.
 *
 * Raw payloads are persisted regardless (that is the point of raw_listings);
 * only the event upsert is gated.
 */

export interface GateInput {
  parsed: PartialEvent[]
  droppedCount: number
  /** listings_found from the last 5 runs that produced any. */
  trailingCounts: number[]
  /** Has this source ever returned a non-zero run? */
  everReturnedRows: boolean
  /** Fraction of this source's existing events whose content_hash would change. */
  churnRatio: number | null
  /**
   * Zero rows is this source's normal resting state (config `sparse`).
   *
   * Bevy chapters (GDG, Friends of Figma, MuleSoft) list only UPCOMING
   * events and sleep between them — GDG Chennai sat at zero the day this
   * shipped, with a past flagship proving the parser worked. Without this
   * flag every quiet week would page as a broken scraper.
   */
  zeroIsNormal?: boolean
  /**
   * Skip the volume check for this run.
   *
   * The gate cannot tell a broken parser from a deliberate config change --
   * adding 37 Luma calendars looks identical to a scraper gone haywire. So a
   * human can wave one run through, and ONLY the volume check: titles, dates
   * and churn still apply, because those catch garbage regardless of why the
   * count moved.
   */
  allowVolumeChange?: boolean
}

export interface GateResult {
  pass: boolean
  status: 'ok' | 'partial' | 'error'
  checks: Record<string, { pass: boolean; detail: string }>
}

const MIN_TITLE_LEN = 5
const TITLE_RATIO = 0.8
const DATE_RATIO = 0.6
const COUNT_LOWER = 0.4
const COUNT_UPPER = 2.5
const MAX_CHURN = 0.5

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function evaluateGates(input: GateInput): GateResult {
  const { parsed, trailingCounts, everReturnedRows, churnRatio } = input
  const checks: GateResult['checks'] = {}
  const total = parsed.length

  // A zero-row run is an error UNLESS this source has genuinely never
  // returned anything. The naive version of this rule ("zero, and we had rows
  // before") marks a brand new, completely broken connector as healthy --
  // exactly when the signal matters most.
  if (total === 0 && input.zeroIsNormal) {
    checks.nonEmpty = { pass: true, detail: '0 rows; sparse source, normal between events' }
    return { pass: true, status: 'ok', checks }
  }
  if (total === 0) {
    checks.nonEmpty = {
      pass: !everReturnedRows,
      detail: everReturnedRows
        ? 'returned 0 rows but this source has returned rows before'
        : 'returned 0 rows; source has never returned any, treating as not-yet-working',
    }
    return {
      pass: false,
      status: everReturnedRows ? 'error' : 'partial',
      checks,
    }
  }
  checks.nonEmpty = { pass: true, detail: `${total} rows` }

  const titled = parsed.filter((e) => (e.title ?? '').trim().length >= MIN_TITLE_LEN).length
  checks.titles = {
    pass: titled / total >= TITLE_RATIO,
    detail: `${titled}/${total} have a title of >=${MIN_TITLE_LEN} chars (need ${TITLE_RATIO * 100}%)`,
  }

  const dated = parsed.filter((e) => e.startsAtLocal || e.registrationDeadline).length
  checks.dates = {
    pass: dated / total >= DATE_RATIO,
    detail: `${dated}/${total} have a parseable date (need ${DATE_RATIO * 100}%)`,
  }

  const med = median(trailingCounts)
  if (input.allowVolumeChange) {
    checks.volume = { pass: true, detail: `${total} rows, volume check waived for this run` }
  } else if (med === null) {
    checks.volume = { pass: true, detail: 'no history to compare against' }
  } else {
    const ratio = total / med
    checks.volume = {
      pass: ratio >= COUNT_LOWER && ratio <= COUNT_UPPER,
      detail: `${total} vs trailing median ${med} (ratio ${ratio.toFixed(2)}, allowed ${COUNT_LOWER}-${COUNT_UPPER})`,
    }
  }

  // A mass content change is a parser change, not the world changing --
  // unless a human explicitly said the parser DID change. Titles and dates
  // stay enforced either way: they are absolute quality, not change detection.
  if (input.allowVolumeChange) {
    checks.churn = {
      pass: true,
      detail: `${churnRatio === null ? 0 : Math.round(churnRatio * 100)}% change, waived for this run`,
    }
  } else if (churnRatio === null) {
    checks.churn = { pass: true, detail: 'no existing events to compare' }
  } else {
    checks.churn = {
      pass: churnRatio < MAX_CHURN,
      detail: `${Math.round(churnRatio * 100)}% of existing events would change (max ${MAX_CHURN * 100}%)`,
    }
  }

  const pass = Object.values(checks).every((c) => c.pass)
  return { pass, status: pass ? 'ok' : 'partial', checks }
}
