import * as cheerio from 'cheerio'
import { parseWithFormats } from '@/lib/dates/parse'
import { KNOWAFEST_FORMATS } from '@/lib/dates/sources'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { decodeEntities } from '@/lib/text'
import type { Connector, FetchContext, FetchResult, PartialEvent, RawListing } from './types'

/**
 * Knowafest -- the Tamil Nadu state page, a server-rendered table of college
 * fests (~100 rows, one request).
 *
 * The list row carries everything essential -- date, name, types, college,
 * city -- so per-fest pages are never fetched: 110 extra requests would buy
 * only a description, and descriptions are excerpts anyway (decision 007).
 *
 * FDPs and culturals are kept and scored, not dropped here: decision 004's
 * quiz precedent drops only what is categorically not attendable-by-interest,
 * and an FDP is attendable. Expect the scorer to floor most of this source --
 * that is the scorer doing its job.
 */

const LIST_URL = 'https://www.knowafest.com/explore/state/Tamil-Nadu'

interface KnowafestRow {
  /** Path under /explore/, e.g. "events/2026/08/0614-krxgen-26-...". */
  path: string
  date: string
  title: string
  types: string
  college: string
  city: string
}

/**
 * Rows are `<tr onclick="window.open('../events/YYYY/MM/NNNN-slug')">` inside
 * `#tablaDatos`; the header row has no onclick, which is what filters it out.
 * Cells: date | name (+ a "View More" button span to strip) | types | college
 * | city.
 */
export function extractRows(html: string): KnowafestRow[] {
  const $ = cheerio.load(html)
  const rows: KnowafestRow[] = []
  $('#tablaDatos tr').each((_, tr) => {
    const onClick = $(tr).attr('onclick') ?? ''
    const match = /window\.open\(\s*'\.\.\/(events\/[^']+?)\/?\s*'/.exec(onClick)
    if (!match) return
    const cells = $(tr).find('td')
    if (cells.length < 5) return
    const titleCell = cells.eq(1).clone()
    titleCell.find('span').remove()
    rows.push({
      path: match[1],
      date: cells.eq(0).text().trim(),
      title: titleCell.text().trim(),
      types: cells.eq(2).text().trim(),
      college: cells.eq(3).text().trim(),
      city: cells.eq(4).text().trim(),
    })
  })
  return rows
}

/**
 * The path already starts with the fest's year and month, so annual fests
 * that reuse a slug still get a distinct uid per edition.
 */
function uidOf(row: KnowafestRow): string {
  return row.path.replace(/^events\//, '')
}

export const knowafestConnector: Connector = {
  id: 'knowafest',
  needsLLM: false,
  volatileFields: [],

  async fetchRaw(ctx: FetchContext): Promise<FetchResult> {
    const res = await ctx.get(LIST_URL)
    const html = await res.text()
    const rows = extractRows(html)
    ctx.log(`Tamil-Nadu: ${rows.length} rows`)

    const seen = new Set<string>()
    const listings: RawListing[] = []
    for (const row of rows) {
      const uid = uidOf(row)
      if (seen.has(uid)) continue
      seen.add(uid)
      listings.push({ sourceUid: uid, payload: row })
      if (listings.length >= ctx.maxListings) break
    }

    return { listings, cursor: {}, done: true }
  },

  toEvent(raw: RawListing): PartialEvent | null {
    const r = raw.payload as KnowafestRow
    if (!r?.title || !r?.path) return null

    // "24 Aug 2026", day-first like every source here.
    const start = parseWithFormats(r.date, KNOWAFEST_FORMATS)

    const url = `https://www.knowafest.com/explore/${r.path}`
    const types = r.types
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    return {
      title: decodeEntities(r.title),
      description: null,
      url,
      canonicalUrl: url,
      imageUrl: null,
      organizer: r.college ? decodeEntities(r.college) : null,

      startsAtLocal: start.local,
      endsAtLocal: start.local,
      startsAt: start.utc,
      endsAt: start.utc,
      registrationDeadline: null,
      tz: DEFAULT_TZ,
      datePrecision: start.precision,
      dateKind: start.local ? 'start' : 'tba',

      // Campus fests; the rare hybrid one says so in its title, and calling
      // it offline keeps it in the walk-in tier where a fest belongs.
      isOnline: false,
      city: r.city || null,
      venue: r.college ? decodeEntities(r.college) : null,
      eventType: types[0]?.toLowerCase() ?? null,
      tags: types.map((t) => t.toLowerCase()),
      priceType: 'unknown',
      priceAmount: null,
      priceCurrency: null,
    }
  },
}
