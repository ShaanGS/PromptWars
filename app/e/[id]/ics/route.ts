import { NextResponse } from 'next/server'
import { getPublicEvent } from '@/lib/queries'
import { buildIcs, icsFilename } from '@/lib/ics'
import { displayTitle } from '@/lib/text'

/**
 * GET /e/:id/ics -- the public page's calendar file.
 *
 * Unauthenticated, and gated by exactly the rule the page is: active event,
 * enabled source, else 404. Carries the same facts the public page shows
 * and no more (buildIcs already uses the excerpt, not the prose).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const e = await getPublicEvent(id)
  if (!e) return new NextResponse('Not found', { status: 404 })

  const title = displayTitle(e.title)
  const body = buildIcs({
    id: e.id,
    title,
    starts_at_local: e.starts_at_local,
    ends_at_local: e.ends_at_local,
    date_precision: e.date_precision,
    venue: e.venue,
    city: e.city,
    url: e.url,
    description: e.description,
  })
  if (!body) return new NextResponse('This event has no date to export', { status: 422 })

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${icsFilename(title)}"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
