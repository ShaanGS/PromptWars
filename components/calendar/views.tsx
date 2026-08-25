import Link from 'next/link'
import { DateTime } from 'luxon'
import type { EventRow } from '@/lib/queries'
import {
  blockKind,
  calendarHref,
  daysIn,
  rangeFor,
  todayIso,
  type CalendarState,
  type DateRange,
} from '@/lib/calendar'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { cn } from '@/lib/utils'
import { categoryOf } from '@/components/event-card'
import { toneClass } from '@/components/ui/bits'
import { EventBlock } from './event-block'

/**
 * The three calendar views. Server components; the only client piece is
 * the EventBlock (it opens the sheet). All of them take the same
 * `byDay` map so switching view is a matter of layout, not data.
 */
type ByDay = Map<string, EventRow[]>

function day(iso: string) {
  return DateTime.fromISO(iso, { zone: DEFAULT_TZ })
}

/** State dot for strips and month cells. */
function Dot({ e, className }: { e: EventRow; className?: string }) {
  const kind = blockKind(e.action_state)
  return (
    <span
      className={cn(
        'size-1.5 rounded-full',
        kind === 'going'
          ? 'bg-accent'
          : kind === 'saved'
            ? cn(toneClass(categoryOf(e).tone), 'ring-1 ring-current/30')
            : 'border border-line-strong bg-surface',
        className,
      )}
    />
  )
}

/* ---------------------------------------------------------------- Day */

export function DayView({ byDay, state }: { byDay: ByDay; state: CalendarState }) {
  const events = byDay.get(state.date) ?? []
  if (!events.length) return null
  return (
    <ul className="grid gap-2">
      {events.map((e) => (
        <li key={e.id}>
          <EventBlock event={e} variant="row" />
        </li>
      ))}
    </ul>
  )
}

/* --------------------------------------------------------------- Week */

export function WeekView({ byDay, state }: { byDay: ByDay; state: CalendarState }) {
  const range = rangeFor('week', state.date)
  const days = daysIn(range)
  const today = todayIso()

  return (
    <>
      {/* Phone: 7-day strip, then the week as an agenda grouped by day. */}
      <div className="lg:hidden">
        <ol className="grid grid-cols-7 gap-1">
          {days.map((iso) => {
            const d = day(iso)
            const list = byDay.get(iso) ?? []
            const isToday = iso === today
            return (
              <li key={iso}>
                <a
                  href={`#d-${iso}`}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-ctl py-2 transition-colors',
                    isToday ? 'bg-ink text-white' : 'hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'text-[11px] font-medium uppercase',
                      isToday ? 'text-white/70' : 'text-ink-3',
                    )}
                  >
                    {d.toFormat('ccccc')}
                  </span>
                  <span className="text-[16px] font-semibold tabular-nums leading-none">
                    {d.toFormat('d')}
                  </span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {list.slice(0, 3).map((e) => (
                      <Dot
                        key={e.id}
                        e={e}
                        className={
                          isToday && blockKind(e.action_state) === 'other'
                            ? 'border-white/60 bg-transparent'
                            : undefined
                        }
                      />
                    ))}
                  </span>
                </a>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 grid gap-6">
          {days.map((iso) => {
            const d = day(iso)
            const list = byDay.get(iso) ?? []
            const isToday = iso === today
            return (
              <section key={iso} id={`d-${iso}`} className="scroll-mt-20">
                <h3 className="flex items-baseline gap-2 text-[15px] font-semibold text-ink">
                  {d.toFormat('cccc d LLL')}
                  {isToday ? (
                    <span className="text-[12.5px] font-medium text-accent">Today</span>
                  ) : null}
                </h3>
                {list.length ? (
                  <ul className="mt-2 grid gap-2">
                    {list.map((e) => (
                      <li key={e.id}>
                        <EventBlock event={e} variant="row" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[13.5px] text-ink-3">Nothing on</p>
                )}
              </section>
            )
          })}
        </div>
      </div>

      {/* Desktop: seven columns, blocks stacked in time order. */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-card lg:block">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] divide-x divide-line">
          {days.map((iso) => {
            const d = day(iso)
            const list = byDay.get(iso) ?? []
            const isToday = iso === today
            return (
              <div key={iso} className="min-w-0">
                <Link
                  href={calendarHref({ ...state, view: 'day', date: iso })}
                  className={cn(
                    'flex items-center gap-2 border-b border-line px-3 py-2.5 transition-colors hover:bg-surface-2',
                    isToday && 'bg-surface-2',
                  )}
                >
                  <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-ink-3">
                    {d.toFormat('ccc')}
                  </span>
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full text-[14px] font-semibold tabular-nums',
                      isToday ? 'bg-accent text-white' : 'text-ink',
                    )}
                  >
                    {d.toFormat('d')}
                  </span>
                </Link>
                <div className="grid min-h-[320px] min-w-0 content-start gap-1.5 p-2">
                  {list.map((e) => (
                    <EventBlock key={e.id} event={e} variant="block" />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- Month */

export function MonthView({ byDay, state }: { byDay: ByDay; state: CalendarState }) {
  const range: DateRange = rangeFor('month', state.date)
  const days = daysIn(range)
  const month = day(state.date).month
  const today = todayIso()
  const weekdays = days.slice(0, 7).map((iso) => day(iso).toFormat('ccc'))

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="grid grid-cols-7 border-b border-line">
        {weekdays.map((w) => (
          <div
            key={w}
            className="px-2 py-2 text-center text-[12px] font-medium uppercase tracking-[0.04em] text-ink-3"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))]">
        {days.map((iso, i) => {
          const d = day(iso)
          const list = byDay.get(iso) ?? []
          const inMonth = d.month === month
          const isToday = iso === today
          const href = calendarHref({ ...state, view: 'day', date: iso })
          return (
            <div
              key={iso}
              className={cn(
                'relative min-h-[64px] border-line p-1.5 lg:min-h-[112px] lg:p-2',
                i % 7 !== 0 && 'border-l',
                i >= 7 && 'border-t',
                !inMonth && 'bg-canvas/60',
              )}
            >
              {/* Phone: the whole cell is the link to the day. */}
              <Link
                href={href}
                aria-label={d.toFormat('cccc d LLLL')}
                className="absolute inset-0 lg:hidden"
              />
              <Link
                href={href}
                className={cn(
                  'relative inline-flex size-7 items-center justify-center rounded-full text-[13.5px] font-medium tabular-nums transition-colors hover:bg-surface-2',
                  isToday
                    ? 'bg-accent text-white hover:bg-accent'
                    : inMonth
                      ? 'text-ink'
                      : 'text-ink-3',
                )}
              >
                {d.toFormat('d')}
              </Link>
              {list.length ? (
                <>
                  <div className="mt-1.5 flex items-center gap-1 lg:hidden">
                    {list.slice(0, 3).map((e) => (
                      <Dot key={e.id} e={e} />
                    ))}
                    {list.length > 3 ? (
                      <span className="text-[10.5px] text-ink-3">+{list.length - 3}</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 hidden gap-1 lg:grid">
                    {list.slice(0, 2).map((e) => (
                      <EventBlock key={e.id} event={e} variant="chip" />
                    ))}
                    {list.length > 2 ? (
                      <Link
                        href={href}
                        className="px-1.5 text-[12px] font-medium text-ink-2 hover:text-ink"
                      >
                        +{list.length - 2} more
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
