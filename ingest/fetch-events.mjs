#!/usr/bin/env node
/**
 * fetch-events.mjs — pulls upcoming hackathon/competition listings from the
 * public Devfolio, Devpost, and Unstop APIs and writes ingest/events.json.
 *
 * Each source names its artwork differently: Devfolio `cover_img` (a real
 * banner), Devpost `thumbnail_url` (a square), Unstop `logoUrl2` (a 150x150
 * logo). All three land in `image_url`; size tuning happens at render time in
 * lib/images.ts, so this file stores what the source actually said.
 *
 * Plain Node (>=18), ESM, zero dependencies — uses global fetch.
 * Run:  node ingest/fetch-events.mjs
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'events.json')
const NOW = new Date()
const PER_SOURCE_CAP = 10
const TOTAL_CAP = 25

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

async function getJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      'user-agent': BROWSER_UA,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

function toIso(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Devpost hands out one shared grey .gif from /assets/defaults/ for every
 * hackathon whose organiser never uploaded artwork -- 8 of 51 on the day this
 * was written. Storing it would put the identical grey tile on a row of cards;
 * the app's own placeholder varies its hue and carries the date, so null is
 * the better picture.
 */
function cleanImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null
  if (url.includes('/assets/defaults/')) return null
  // Devpost's thumbnail_url is protocol-relative ("//d112y...").
  return url.startsWith('//') ? `https:${url}` : url
}

/** An event is upcoming if its deadline or start (whichever exists) is in the future. */
function isUpcoming(ev) {
  const ref = ev.deadline_at ?? ev.starts_at ?? ev.ends_at
  return ref !== null && new Date(ref) > NOW
}

// ---------------------------------------------------------------------------
// Devfolio — POST https://api.devfolio.co/api/search/hackathons
// Elasticsearch-style search endpoint behind devfolio.co/hackathons.
// type=application_open returns only hackathons you can still apply to.
// Returns real ISO starts_at/ends_at plus hackathon_setting.reg_ends_at.
// ---------------------------------------------------------------------------
async function fetchDevfolio() {
  const body = await getJson('https://api.devfolio.co/api/search/hackathons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'application_open', from: 0, size: 50 }),
  })
  const hits = body?.hits?.hits ?? []
  const events = []
  for (const hit of hits) {
    const h = hit?._source
    if (!h?.name || !h?.slug) continue
    const themes = Array.isArray(h.themes)
      ? h.themes.map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
      : []
    events.push({
      source: 'devfolio',
      external_url: `https://${h.slug}.devfolio.co/`,
      title: h.name,
      host: null,
      mode: h.is_online ? 'online' : 'in_person',
      location: h.is_online ? null : (h.location ?? ([h.city, h.country].filter(Boolean).join(', ') || null)),
      starts_at: toIso(h.starts_at),
      ends_at: toIso(h.ends_at),
      deadline_at: toIso(h.hackathon_setting?.reg_ends_at),
      image_url: cleanImageUrl(h.cover_img),
      tags: themes.slice(0, 5),
    })
  }
  return events
}

// ---------------------------------------------------------------------------
// Devpost — GET https://devpost.com/api/hackathons
// Public JSON. No ISO timestamps: submission_period_dates is a display string
// ("Aug 25 - Sep 30, 2026" / "Dec 01, 2025 - Jan 10, 2026"), so the window is
// parsed by hand and its end is treated as the deadline.
// ---------------------------------------------------------------------------
const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

function parseDevpostRange(text) {
  if (!text) return { start: null, end: null }
  const clean = text.replace(/\s+/g, ' ').trim()
  const part = String.raw`([A-Za-z]{3,9})\s+(\d{1,2})(?:,\s*(\d{4}))?`
  const m = clean.match(new RegExp(`^${part}\\s*-\\s*(?:${part}|(\\d{1,2}))(?:,\\s*(\\d{4}))?$`))
  const single = clean.match(new RegExp(`^${part}$`))
  const mk = (mon, day, year) => {
    const mi = MONTHS[mon?.slice(0, 3).toLowerCase()]
    if (mi === undefined || !year) return null
    return new Date(Date.UTC(Number(year), mi, Number(day), 23, 59, 59))
  }
  if (m) {
    const [, m1, d1, y1, m2, d2, y2, dOnly, yTail] = m
    const endYear = y2 ?? yTail ?? y1
    const startYear = y1 ?? endYear
    const start = mk(m1, d1, startYear)
    const end = dOnly ? mk(m1, dOnly, endYear) : mk(m2, d2, endYear)
    return { start, end }
  }
  if (single) {
    const [, m1, d1, y1] = single
    const d = mk(m1, d1, y1)
    return { start: d, end: d }
  }
  return { start: null, end: null }
}

async function fetchDevpostPage(query) {
  const body = await getJson(`https://devpost.com/api/hackathons?${query}`)
  return body?.hackathons ?? []
}

async function fetchDevpost() {
  // India-relevant first, then the global open list to top up.
  const batches = await Promise.all([
    fetchDevpostPage('search=india&status[]=upcoming&status[]=open&per_page=50&page=1'),
    fetchDevpostPage('status[]=upcoming&status[]=open&per_page=50&page=1'),
  ])
  const events = []
  for (const h of batches.flat()) {
    if (!h?.title || !h?.url) continue
    const locationText = h.displayed_location?.location ?? null
    const isOnline = /online|virtual|anywhere/i.test(locationText ?? '')
    const { start, end } = parseDevpostRange(h.submission_period_dates)
    events.push({
      source: 'devpost',
      external_url: h.url,
      title: h.title,
      host: h.organization_name?.trim() || null,
      mode: isOnline ? 'online' : 'in_person',
      location: isOnline ? null : locationText,
      starts_at: start ? start.toISOString() : null,
      ends_at: end ? end.toISOString() : null,
      deadline_at: end ? end.toISOString() : null,
      image_url: cleanImageUrl(h.thumbnail_url),
      tags: (h.themes ?? []).map((t) => t?.name).filter(Boolean).slice(0, 5),
    })
  }
  return events
}

// ---------------------------------------------------------------------------
// Unstop — GET https://unstop.com/api/public/opportunity/search-result
// robots.txt explicitly allows /api/public/*. end_date is the registration
// close (ISO with offset); there is no start time. Quizzes are skipped.
// ---------------------------------------------------------------------------
async function fetchUnstop() {
  const events = []
  const seen = new Set()
  for (const type of ['hackathons', 'competitions']) {
    let body
    try {
      body = await getJson(
        `https://unstop.com/api/public/opportunity/search-result?opportunity=${type}&page=1&per_page=30&oppstatus=open`,
      )
    } catch (err) {
      console.error(`unstop ${type}: ${err.message}`)
      continue
    }
    for (const item of body?.data?.data ?? []) {
      if (!item?.title || item.type === 'quizzes') continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const url = item.seo_url ?? (item.public_url ? `https://unstop.com/${item.public_url}` : null)
      if (!url) continue
      const region = (item.region ?? '').toLowerCase()
      const mode = region === 'online' ? 'online' : region === 'hybrid' ? 'hybrid' : region ? 'in_person' : null
      const organizer = item.organisation?.name?.trim() || null
      const filters = Array.isArray(item.filters)
        ? item.filters.map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
        : []
      events.push({
        source: 'unstop',
        external_url: url.startsWith('http') ? url : `https://unstop.com/${url.replace(/^\/+/, '')}`,
        title: item.title,
        host: organizer,
        mode,
        // Offline Unstop listings carry no location field; the organiser name
        // is the only geographic signal, already surfaced via `host`.
        location: null,
        starts_at: null,
        ends_at: null,
        deadline_at: toIso(item.end_date),
        // Unstop publishes no banner -- logoUrl2 is the organiser's 150x150
        // mark, and only that size exists on their CDN.
        image_url: cleanImageUrl(item.logoUrl2),
        tags: filters.slice(0, 5),
      })
    }
  }
  return events
}

// ---------------------------------------------------------------------------

async function main() {
  const results = await Promise.allSettled([fetchDevfolio(), fetchDevpost(), fetchUnstop()])
  const names = ['devfolio', 'devpost', 'unstop']
  const all = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const upcoming = r.value.filter(isUpcoming).slice(0, PER_SOURCE_CAP)
      console.log(`${names[i]}: ${r.value.length} fetched, ${upcoming.length} kept`)
      all.push(...upcoming)
    } else {
      console.error(`${names[i]}: FAILED — ${r.reason?.message ?? r.reason}`)
    }
  })

  const deduped = []
  const seenUrls = new Set()
  for (const ev of all) {
    if (seenUrls.has(ev.external_url)) continue
    seenUrls.add(ev.external_url)
    deduped.push(ev)
  }

  const final = deduped.slice(0, TOTAL_CAP)
  writeFileSync(OUT, JSON.stringify(final, null, 2) + '\n')
  console.log(`wrote ${final.length} events to ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
