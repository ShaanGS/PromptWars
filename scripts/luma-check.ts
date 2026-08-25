/**
 * Verify Luma calendar slugs before adding them to the config.
 *
 *   npm run luma:check                 # check everything already configured
 *   npm run luma:check -- slug1 slug2  # try candidates before committing them
 *
 * Luma has no directory and no search API, so the calendar list is curated by
 * hand -- which makes a dead or mistyped slug easy to add and hard to notice.
 * A bad slug fails quietly inside the connector: the run still succeeds, it
 * just silently carries fewer events.
 *
 * Reports, per slug: whether the page resolves, whether a cal- id can be
 * extracted, how many upcoming events the feed holds, and how many of those
 * look like Chennai or Tamil Nadu.
 */
import './load-env'
import ical from 'node-ical'
import { LUMA_CALENDARS } from '@/config/luma-calendars'
import { HONEST_UA as UA } from '@/config/sources'
import { mightBeInScope } from '@/lib/pipeline/geo'

interface Report {
  slug: string
  ok: boolean
  calendarId?: string
  name?: string
  total?: number
  upcoming?: number
  local?: number
  note?: string
}

async function check(slug: string): Promise<Report> {
  let calendarId: string | undefined

  // A raw cal- id needs no page fetch. Several of the most active Chennai
  // hosts have no vanity slug at all.
  if (slug.startsWith('cal-')) {
    calendarId = slug
  } else {
    const page = await fetch(`https://lu.ma/${slug}`, { headers: { 'user-agent': UA } })
    if (!page.ok) {
      return { slug, ok: false, note: `lu.ma/${slug} returned ${page.status}` }
    }
    const html = await page.text()
    calendarId = /"(cal-[A-Za-z0-9]{6,})"/.exec(html)?.[1]
  }

  if (!calendarId) {
    // Usually means the slug is an individual event or a profile, not a calendar.
    return { slug, ok: false, note: 'no cal- id (an event page or profile, not a calendar?)' }
  }

  const feed = await fetch(`https://api.lu.ma/ics/get?entity=calendar&id=${calendarId}`, {
    headers: { 'user-agent': UA },
  })
  if (!feed.ok) {
    return { slug, ok: false, calendarId, note: `ICS returned ${feed.status}` }
  }

  const text = await feed.text()
  const parsed = ical.sync.parseICS(text)
  const name = /X-WR-CALNAME:(.+)/.exec(text)?.[1]?.trim()

  const now = Date.now()
  let total = 0
  let upcoming = 0
  let local = 0

  for (const value of Object.values(parsed)) {
    const v = value as { type?: string; start?: Date; summary?: string; location?: string }
    if (v.type !== 'VEVENT' || !(v.start instanceof Date)) continue
    total++
    if (v.start.getTime() < now) continue
    upcoming++
    if (mightBeInScope(`${v.summary ?? ''} ${v.location ?? ''}`)) local++
  }

  return { slug, ok: true, calendarId, name, total, upcoming, local }
}

async function main() {
  const args = process.argv.slice(2)
  const slugs = args.length ? args : LUMA_CALENDARS
  if (!slugs.length) {
    console.log('No slugs configured. Pass some as arguments to test candidates.')
    return
  }

  console.log(`Checking ${slugs.length} slug(s)\n`)
  const reports: Report[] = []

  for (const slug of slugs) {
    try {
      reports.push(await check(slug))
    } catch (err) {
      reports.push({
        slug,
        ok: false,
        note: err instanceof Error ? err.message : String(err),
      })
    }
    // Polite pacing -- this hits two Luma endpoints per slug.
    await new Promise((r) => setTimeout(r, 1200))
  }

  for (const r of reports) {
    if (!r.ok) {
      console.log(`  DEAD  ${r.slug.padEnd(24)} ${r.note}`)
      continue
    }
    const localNote = r.local ? `${r.local} look local` : 'none look local'
    console.log(
      `  OK    ${r.slug.padEnd(24)} ${String(r.upcoming).padStart(3)} upcoming, ${localNote}` +
        `  ${r.name ? `(${r.name})` : ''}`,
    )
  }

  const dead = reports.filter((r) => !r.ok)
  const useful = reports.filter((r) => r.ok && (r.local ?? 0) > 0)
  console.log(
    `\n${reports.length - dead.length}/${reports.length} resolved, ${useful.length} with Chennai or Tamil Nadu events`,
  )

  // Non-zero so CI can gate on it: a slug that stopped resolving should be
  // noticed, not silently carried.
  if (dead.length) {
    console.error(`\n${dead.length} slug(s) did not resolve.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
