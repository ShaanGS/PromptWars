'use client'

import Link from 'next/link'
import { DateTime } from 'luxon'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Clock,
  DownloadSimple,
  Globe,
  MapPin,
} from '@phosphor-icons/react'
import type { EventRow } from '@/lib/queries'
import { blockKind, isTimed, spanLabel, timeLabel, type BlockKind } from '@/lib/calendar'
import { formatRange, googleCalendarUrl } from '@/lib/dates/format'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { displayTitle } from '@/lib/text'
import { cn } from '@/lib/utils'
import { SOURCE_LABELS, categoryOf } from '@/components/event-card'
import { CardActions } from '@/components/card-actions'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DataRow, toneClass } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'
import { buttonVariants } from '@/components/ui/button'

/**
 * One event on the calendar, in whichever shape the view needs, and the
 * sheet it opens.
 *
 * `row`   -- agenda line: colour bar, time, title, place (day + phone week)
 * `block` -- stacked card in a desktop week column
 * `chip`  -- one-line chip in a desktop month cell
 *
 * Colour is the state: going = accent, saved = its category pastel,
 * everything else = white with a hairline. The sheet carries the facts and
 * the same actions as the detail page, so you rarely need to leave.
 */
export type BlockVariant = 'row' | 'block' | 'chip'

export function kindClass(kind: BlockKind, tone: ReturnType<typeof categoryOf>['tone']): string {
  if (kind === 'going') return 'bg-accent text-white'
  if (kind === 'saved') return toneClass(tone)
  return 'border border-line bg-surface text-ink hover:border-line-strong'
}

export function EventBlock({ event, variant }: { event: EventRow; variant: BlockVariant }) {
  const kind = blockKind(event.action_state)
  const category = categoryOf(event)
  const title = displayTitle(event.title)
  const time = timeLabel(event)
  const span = spanLabel(event)
  const place = event.is_online ? 'Online' : (event.area ?? event.city ?? event.venue ?? null)
  const source = SOURCE_LABELS[event.source_id] ?? event.source_id
  const colour = kindClass(kind, category.tone)
  const quiet = kind === 'going' ? 'text-white/75' : kind === 'saved' ? 'opacity-70' : 'text-ink-2'

  const range = formatRange(
    event.starts_at_local,
    event.ends_at_local,
    event.date_precision as never,
  )
  const startDt = event.starts_at_local
    ? DateTime.fromISO(event.starts_at_local, { zone: DEFAULT_TZ })
    : null
  const when = startDt?.isValid ? `${startDt.toFormat('cccc')}, ${range}` : range
  const calendarUrl = googleCalendarUrl({
    title,
    local: event.starts_at_local,
    endLocal: event.ends_at_local,
    precision: event.date_precision as never,
    venue: event.venue ?? event.city,
    url: event.url,
  })
  const where = event.is_online
    ? 'Online'
    : [event.venue, event.area, event.city]
        .filter((s): s is string => Boolean(s))
        .filter((s, i, all) => all.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i)
        .join(', ') || null

  let trigger: React.ReactNode
  if (variant === 'row') {
    trigger = (
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-stretch gap-3 rounded-ctl text-left transition-colors',
          kind === 'other' ? 'border border-line bg-surface hover:border-line-strong' : colour,
        )}
      >
        {kind === 'other' ? (
          <span className={cn('w-1 shrink-0 rounded-l-ctl', toneClass(category.tone))} />
        ) : null}
        <span
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 py-3',
            kind === 'other' ? 'pr-3.5' : 'px-3.5',
          )}
        >
          <span className={cn('w-[72px] shrink-0 text-[13px] font-medium tabular-nums', quiet)}>
            {time}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-snug">{title}</span>
            <span className={cn('block truncate text-[13px]', quiet)}>
              {[place, span].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
      </button>
    )
  } else if (variant === 'block') {
    trigger = (
      <button
        type="button"
        className={cn(
          'block w-full min-w-0 rounded-ctl px-3 py-2.5 text-left transition-colors',
          colour,
        )}
      >
        <span className={cn('block text-[12px] font-medium', quiet)}>
          {time}
          {span ? ` ${span}` : ''}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[13.5px] font-medium leading-snug">
          {title}
        </span>
        {place ? (
          <span className={cn('mt-0.5 block truncate text-[12px]', quiet)}>{place}</span>
        ) : null}
      </button>
    )
  } else {
    trigger = (
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[12px] font-medium',
          colour,
        )}
        title={title}
      >
        {isTimed(event) ? (
          <span className={cn('shrink-0 tabular-nums', quiet)}>
            {time.replace(/:00/, '').replace(' ', '').toLowerCase()}
          </span>
        ) : null}
        <span className="truncate">{title}</span>
      </button>
    )
  }

  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent title={title} description={[when, where].filter(Boolean).join(' · ')}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={category.tone} size="sm">
            {category.label}
          </Pill>
          {kind === 'going' ? (
            <Pill tone="accent" size="sm">
              Going
            </Pill>
          ) : null}
          {kind === 'saved' ? (
            <Pill tone="accent-soft" size="sm">
              Saved
            </Pill>
          ) : null}
          <Pill tone="outline" size="sm">
            via {source}
          </Pill>
        </div>
        <div className="mt-4 grid gap-2">
          <DataRow icon={<Clock weight="duotone" />} label="When" value={when} tone="sky" />
          <DataRow
            icon={event.is_online ? <Globe weight="duotone" /> : <MapPin weight="duotone" />}
            label="Where"
            value={where ?? 'Not stated'}
            tone={where ? (event.is_online ? 'lilac' : 'rose') : 'neutral'}
          />
        </div>
        <div className="mt-4">
          <CardActions eventId={event.id} state={(event.action_state ?? null) as never} />
        </div>
        <div className="mt-4 grid gap-2">
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ variant: 'primary', size: 'md', className: 'w-full' })}
          >
            Open on {source}
            <ArrowUpRight weight="bold" />
          </a>
          <div className="grid grid-cols-2 gap-2">
            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'md',
                  className: 'w-full',
                })}
              >
                <CalendarPlus weight="bold" />
                Google
              </a>
            ) : null}
            <a
              href={`/event/${event.id}/ics`}
              className={buttonVariants({ variant: 'secondary', size: 'md', className: 'w-full' })}
            >
              <DownloadSimple weight="bold" />
              .ics
            </a>
          </div>
        </div>
        <Link
          href={`/event/${event.id}`}
          className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
        >
          Full details
          <ArrowRight size={14} weight="bold" />
        </Link>
      </SheetContent>
    </Sheet>
  )
}
