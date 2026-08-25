import Link from 'next/link'
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr'
import {
  calendarHref,
  rangeLabel,
  stepDate,
  todayIso,
  type CalendarState,
  type CalendarView,
} from '@/lib/calendar'
import { cn } from '@/lib/utils'
import { Segmented } from '@/components/ui/segmented'
import { chipClass } from '@/components/ui/chip'
import { buttonVariants } from '@/components/ui/button'

/**
 * Calendar toolbar: range with prev / today / next, the Day · Week · Month
 * control, Mine / Everything, and the colour legend. Every control is a
 * link to another URL -- the page is stateless.
 */
export function CalendarToolbar({
  state,
  counts,
}: {
  state: CalendarState
  counts: { mine: number; all: number }
}) {
  const today = todayIso()
  const views: { value: CalendarView; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={calendarHref({ ...state, date: stepDate(state.view, state.date, -1) })}
            aria-label={`Previous ${state.view}`}
            className={buttonVariants({ variant: 'secondary', size: 'icon-sm', pill: true })}
            scroll={false}
          >
            <CaretLeft weight="bold" />
          </Link>
          <Link
            href={calendarHref({ ...state, date: stepDate(state.view, state.date, 1) })}
            aria-label={`Next ${state.view}`}
            className={buttonVariants({ variant: 'secondary', size: 'icon-sm', pill: true })}
            scroll={false}
          >
            <CaretRight weight="bold" />
          </Link>
        </div>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink sm:text-[22px]">
          {rangeLabel(state.view, state.date)}
        </h2>
        {state.date !== today ? (
          <Link
            href={calendarHref({ ...state, date: today })}
            className={buttonVariants({ variant: 'ghost', size: 'sm', pill: true })}
            scroll={false}
          >
            Today
          </Link>
        ) : null}
        <div className="ml-auto">
          <Segmented
            aria-label="Calendar view"
            size="sm"
            value={state.view}
            options={views.map((v) => ({ ...v, href: calendarHref({ ...state, view: v.value }) }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={calendarHref({ ...state, scope: 'mine' })}
          className={chipClass(state.scope === 'mine', 'h-9 text-[13.5px]')}
          scroll={false}
        >
          Mine
          <span
            className={cn('tabular-nums', state.scope === 'mine' ? 'text-white/70' : 'text-ink-3')}
          >
            {counts.mine}
          </span>
        </Link>
        <Link
          href={calendarHref({ ...state, scope: 'all' })}
          className={chipClass(state.scope === 'all', 'h-9 text-[13.5px]')}
          scroll={false}
        >
          Everything
          {state.scope === 'all' ? (
            <span className="tabular-nums text-white/70">{counts.all}</span>
          ) : null}
        </Link>
        <ul
          className="ml-auto flex items-center gap-3 text-[12.5px] text-ink-2"
          aria-label="Legend"
        >
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-accent" /> Going
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-lilac ring-1 ring-lilac-ink/30" /> Saved
          </li>
          {state.scope === 'all' ? (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-line-strong bg-surface" />{' '}
              Everything else
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
