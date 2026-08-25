import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { getCalendarEvents } from '@/lib/queries'
import {
  calendarHref,
  groupByDay,
  parseCalendarState,
  placementDay,
  rangeFor,
} from '@/lib/calendar'
import { Page, PageHeader } from '@/components/shell/page-header'
import { EmptyState } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'
import { CalendarToolbar } from '@/components/calendar/toolbar'
import { DayView, MonthView, WeekView } from '@/components/calendar/views'

/**
 * /calendar -- your week, your month, the events you said yes to.
 *
 * URL-driven (`?view=&date=&scope=`), server-rendered, Asia/Kolkata.
 * "Mine" is what you marked Going or saved; "Everything" adds the open
 * feed tiers so the same grid works for planning. The views differ only
 * in layout: one query, one group-by-day, three renderers.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const state = parseCalendarState(await searchParams)
  const range = rangeFor(state.view, state.date)
  const fromIso = range.start.toUTC().toISO()!
  const toIso = range.end.toUTC().toISO()!

  // Both counts are shown on the scope chips, so "Mine" is fetched even
  // when viewing everything; it is the cheaper of the two.
  const [mine, all] = await Promise.all([
    getCalendarEvents(user.id, fromIso, toIso, 'mine'),
    state.scope === 'all'
      ? getCalendarEvents(user.id, fromIso, toIso, 'all')
      : Promise.resolve(null),
  ])
  const events = all ?? mine
  const placed = events.filter((e) => placementDay(e) !== null)
  const undated = events.length - placed.length
  const byDay = groupByDay(placed)
  const counts = { mine: mine.filter((e) => placementDay(e) !== null).length, all: placed.length }

  const View = state.view === 'day' ? DayView : state.view === 'week' ? WeekView : MonthView
  const empty = placed.length === 0

  return (
    <Page>
      <PageHeader title="Calendar" subtitle="Your week, your month, the events you said yes to." />
      <div className="mt-6">
        <CalendarToolbar state={state} counts={counts} />
      </div>

      <div className="mt-5">
        {empty && state.view !== 'month' ? (
          state.scope === 'mine' ? (
            <EmptyState
              icon={<CalendarBlank weight="duotone" />}
              title={`Nothing on your calendar this ${state.view}`}
              body="Mark events Going or save them from the feed and they land here. Or look at everything in scope to plan."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/" className={buttonVariants({ variant: 'primary' })}>
                    Go to the feed
                  </Link>
                  <Link
                    href={calendarHref({ ...state, scope: 'all' })}
                    className={buttonVariants({ variant: 'secondary' })}
                  >
                    Show everything
                  </Link>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<CalendarBlank weight="duotone" />}
              title={`No events in scope this ${state.view}`}
              body="Nothing from the enabled sources lands in this range. Try the next one."
            />
          )
        ) : (
          <View byDay={byDay} state={state} />
        )}
      </div>

      {undated > 0 ? (
        <p className="mt-4 text-[13px] text-ink-3">
          {undated} undated event{undated === 1 ? '' : 's'} in scope not shown — no day to put{' '}
          {undated === 1 ? 'it' : 'them'} on.
        </p>
      ) : null}
    </Page>
  )
}
