import type { AvailabilityWindow } from '@/lib/engine'

/**
 * A person's availability, as a sentence.
 *
 * The problem statement names availability as one of the five things a match
 * should account for, and the engine already scores it -- but the profile
 * screen showed the windows nowhere, so the one place a human goes to decide
 * "could I actually work with this person" was silent about it.
 *
 * Deliberately coarse. The engine works in shared minutes per week and that
 * is the number that ranks; this is the human-readable gloss beside it, and a
 * grid of exact windows would be a calendar, not a profile.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Minutes since midnight, or null when the string is not "HH:MM". */
function minutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Windows that start at or after 17:00 read as evenings to a student. */
const EVENING_FROM = 17 * 60
/** Anything wholly before noon is a morning. */
const MORNING_UNTIL = 12 * 60

export function weeklyMinutes(windows: AvailabilityWindow[]): number {
  let total = 0
  for (const w of windows) {
    const start = minutes(w.start)
    const end = minutes(w.end)
    // A malformed or inverted window contributes nothing rather than a
    // negative, which would read as "less free than nothing".
    if (start === null || end === null || end <= start) continue
    total += end - start
  }
  return total
}

export function summariseAvailability(windows: AvailabilityWindow[]): string | null {
  if (!windows.length) return null

  const valid = windows.filter((w) => {
    const start = minutes(w.start)
    const end = minutes(w.end)
    return start !== null && end !== null && end > start && w.day >= 0 && w.day <= 6
  })
  if (!valid.length) return null

  const days = [...new Set(valid.map((w) => w.day))].sort((a, b) => a - b)
  const weekendOnly = days.every((d) => d === 0 || d === 6)
  const allEvening = valid.every((w) => (minutes(w.start) ?? 0) >= EVENING_FROM)
  const allMorning = valid.every((w) => (minutes(w.end) ?? 24 * 60) <= MORNING_UNTIL)

  const timePart = allEvening ? ' evenings' : allMorning ? ' mornings' : ''

  // "Weekend mornings" reads; "Weekends mornings" does not. The plural only
  // stands when it is carrying the phrase alone.
  const dayPart = weekendOnly
    ? timePart
      ? 'Weekend'
      : 'Weekends'
    : days.length >= 5
      ? 'Most days'
      : days.map((d) => DAY_NAMES[d]).join(' & ')
  const hours = Math.round(weeklyMinutes(valid) / 60)

  return `${dayPart}${timePart} · ~${hours} h/week`
}
