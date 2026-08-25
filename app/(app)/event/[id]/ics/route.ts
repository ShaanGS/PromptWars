import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/server'
import { getEventById } from '@/lib/queries'
import { buildIcs, icsFilename } from '@/lib/ics'
import { displayTitle } from '@/lib/text'

/**
 * GET /event/:id/ics -- one event as a downloadable .ics file.
 *
 * Auth-gated like every page: the calendar file carries the same facts
 * the detail page shows, so it has the same audience. Content-Disposition
 * makes the browser save it; phones hand it straight to the calendar app.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return new NextResponse('Sign in required', { status: 401 })

  const { id } = await ctx.params
  const detail = await getEventById(user.id, id)
  if (!detail) return new NextResponse('Not found', { status: 404 })

  const e = detail.event
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
      'Cache-Control': 'private, no-store',
    },
  })
}
