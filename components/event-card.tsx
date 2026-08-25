import Link from 'next/link'
import { DateTime } from 'luxon'
import {
  ArrowUpRight,
  Confetti,
  Globe,
  MapPin,
  Microphone,
  Rocket,
  UsersThree,
} from '@phosphor-icons/react/dist/ssr'
import { formatRange, relativeDeadline } from '@/lib/dates/format'
import { DEFAULT_TZ } from '@/lib/dates/types'
import type { EventRow } from '@/lib/queries'
import { bandFor } from '@/lib/theme'
import { bestImageUrl } from '@/lib/images'
import { displayTitle } from '@/lib/text'
import { cn } from '@/lib/utils'
import { Pill, type PillTone } from '@/components/ui/pill'
import { toneClass } from '@/components/ui/bits'
import { EventImage } from './feed/event-image'
import { CardActions } from './card-actions'
import { CardShell } from './card-shell'

export const SOURCE_LABELS: Record<string, string> = {
  devfolio: 'Devfolio',
  devpost: 'Devpost',
  unstop: 'Unstop',
  allevents: 'AllEvents',
  luma: 'Luma',
  eventbrite: 'Eventbrite',
  gdg: 'GDG Chennai',
  figma: 'Friends of Figma',
  mulesoft: 'MuleSoft',
  knowafest: 'Knowafest',
  manual: 'Hand-picked',
  ocgroups: 'OCG',
  tie: 'TiE',
}

/**
 * Category cue from the title. A visual hint, not data: no source gives a
 * usable category and an LLM call for decoration would waste the budget.
 */
export function categoryOf(event: Pick<EventRow, 'title' | 'event_type'>): {
  Icon: typeof Rocket
  tone: PillTone
  label: string
} {
  const text = `${event.title} ${event.event_type ?? ''}`.toLowerCase()
  if (/hack|code|dev|tech|ai\b|data|design|ux|product/.test(text)) {
    return { Icon: Rocket, tone: 'lilac', label: 'Tech' }
  }
  if (/network|meetup|connect|founder|business|entrepreneur|startup|investor/.test(text)) {
    return { Icon: UsersThree, tone: 'mint', label: 'Networking' }
  }
  if (/summit|conference|conclave|expo|forum|workshop|masterclass/.test(text)) {
    return { Icon: Microphone, tone: 'sky', label: 'Conference' }
  }
  return { Icon: Confetti, tone: 'peach', label: 'Event' }
}

/**
 * The event card -- image first, one title, one meta line, a few pills, and
 * the actions. Built so a column of them on a phone reads like a feed, not
 * a table.
 */
export function EventCard({
  event,
  dismissOnSkip = false,
}: {
  event: EventRow
  /** Feed only: "Not for me" swipes the card away (see CardShell). */
  dismissOnSkip?: boolean
}) {
  const band = bandFor(event.relevance_score)
  const deadline = relativeDeadline(event.registration_deadline)
  const urgent = deadline !== null && deadline.days >= 0 && deadline.days <= 7
  const category = categoryOf(event)
  const going = event.action_state === 'registered' || event.action_state === 'going'
  const saved = event.action_state === 'interested'

  // Deadline listings (Devpost, Unstop) have no start time worth showing:
  // `starts_at` is when the submission window OPENED, so rendering it the way
  // a meetup is rendered puts a past date on something you can still enter.
  // The cutoff is the date that can cost you the event, so that is the date.
  const closesAt =
    event.date_kind === 'deadline' && event.registration_deadline
      ? DateTime.fromISO(event.registration_deadline, { zone: DEFAULT_TZ })
      : null
  const startsAt = event.starts_at_local
    ? DateTime.fromISO(event.starts_at_local, { zone: DEFAULT_TZ })
    : null
  let dt = closesAt ?? startsAt
  // Unstop cutoffs land at 12:01 AM / 11:59 PM -- a clock artifact, not a
  // time anyone should plan around. Shown date-only.
  if (dt && closesAt && (dt.hour === 0 || (dt.hour === 23 && dt.minute >= 50))) {
    dt = dt.startOf('day')
  }
  const when = formatRange(
    event.starts_at_local,
    event.ends_at_local,
    event.date_precision as never,
  )
  const whenLabel = closesAt
    ? `Closes ${closesAt.toFormat('ccc d LLL')}`
    : startsAt
      ? `${startsAt.toFormat('ccc')} ${when}`
      : when
  // Luma sometimes carries the event's own link where a venue belongs;
  // "Mon 7 Sep · https://…" on a card is the sloppiest thing a feed can say.
  const notUrl = (s: string | null) => (s && !/^https?:\/\//i.test(s) ? s : null)
  const place = event.is_online
    ? 'Online'
    : (notUrl(event.area) ?? notUrl(event.city) ?? notUrl(event.venue))
  const price =
    event.price_type === 'free'
      ? 'Free'
      : event.price_amount
        ? `₹${Math.round(event.price_amount)}`
        : null
  const meta = [whenLabel, place, price].filter(Boolean).join(' · ')
  const title = displayTitle(event.title)
  const image = bestImageUrl(event.image_url)

  const card = (
    <article
      className={cn(
        // h-full: inside CardShell the article is no longer the grid item,
        // so without it cards in a row shrink-wrap to their own content and
        // the grid loses its even rows (Shaan's screenshot, 2026-08-24).
        'group flex h-full flex-col overflow-hidden rounded-card border bg-surface shadow-card transition-colors',
        going
          ? 'border-accent'
          : saved
            ? 'border-accent/40'
            : 'border-line hover:border-line-strong',
      )}
    >
      <Link href={`/event/${event.id}`} className="relative block shrink-0" aria-label={title}>
        {image ? (
          <EventImage src={image} />
        ) : (
          <Placeholder dt={dt} tone={category.tone} Icon={category.Icon} />
        )}

        {/* Overlays on the media: newness and the date, like the references. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex gap-1.5">
            {event.seen_at === null ? (
              <Pill tone="ink" size="sm">
                New
              </Pill>
            ) : null}
            {urgent && deadline ? (
              <Pill tone="warning" size="sm">
                Closes {deadline.label.replace(/^closes\s*/, '')}
              </Pill>
            ) : null}
          </div>
          {band.label ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface/95 px-2.5 text-[12px] font-medium text-ink backdrop-blur-sm">
              <span className={cn('size-1.5 rounded-full', band.dot)} />
              {band.label}
              {event.relevance_score !== null ? (
                <span className="tabular-nums text-ink-3">{event.relevance_score}</span>
              ) : null}
            </span>
          ) : null}
        </div>
        {dt && image ? (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex h-7 items-center rounded-full bg-surface/95 px-3 text-[12.5px] font-medium text-ink backdrop-blur-sm">
            {closesAt ? 'Closes ' : ''}
            {dt.toFormat('ccc d LLL')}
            {/* A midnight "time" is an iCal all-day artifact, not a start. */}
            {!closesAt && event.date_precision === 'instant' && (dt.hour || dt.minute)
              ? ` · ${dt.toFormat('h:mm a')}`
              : ''}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={`/event/${event.id}`} className="hover:underline underline-offset-2">
            {title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-ink-2">
          {event.is_online ? (
            <Globe size={15} weight="bold" className="shrink-0 text-ink-3" />
          ) : (
            <MapPin size={15} weight="bold" className="shrink-0 text-ink-3" />
          )}
          <span className="truncate">{meta}</span>
        </p>
        {event.organizer ? (
          <p className="mt-1 truncate text-[13px] text-ink-3">by {event.organizer}</p>
        ) : null}
        {event.fit?.reasons.length ? (
          <p className="mt-2.5">
            <Pill tone="accent-soft" size="sm">
              For you · {event.fit.reasons.slice(0, 2).join(', ')}
            </Pill>
          </p>
        ) : null}
        {/* LLM reasons are prose worth reading ("founders in the room").
            Keyword-pass ones are "Matches x, y" -- machine copy restating
            the tags below; those stay off the card. */}
        {/* "Hand-picked" is the manual pipeline's marker, already said by
            the source pill -- redundant as body copy. */}
        {event.relevance_reason &&
        !/^matches\b/i.test(event.relevance_reason) &&
        event.relevance_reason !== 'Hand-picked' ? (
          <p
            className={cn(
              'line-clamp-2 text-[13.5px] leading-relaxed text-ink-2',
              event.fit?.reasons.length ? 'mt-2' : 'mt-2.5',
            )}
          >
            {event.relevance_reason}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-1.5 pt-4">
          <Pill tone={category.tone} size="sm">
            {category.label}
          </Pill>
          <Pill tone="outline" size="sm">
            {SOURCE_LABELS[event.source_id] ?? event.source_id}
          </Pill>
          {(event.duplicate_count ?? 1) > 1 ? (
            <Pill tone="neutral" size="sm">
              +{event.duplicate_count! - 1} listing{event.duplicate_count! > 2 ? 's' : ''}
            </Pill>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
          <CardActions eventId={event.id} state={(event.action_state ?? null) as never} />
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink/85"
          >
            Open
            <ArrowUpRight size={14} weight="bold" />
          </a>
        </div>
      </div>
    </article>
  )

  return dismissOnSkip ? <CardShell>{card}</CardShell> : card
}

/** No banner: a pastel block with the date as the hero, calendar-style. */
function Placeholder({
  dt,
  tone,
  Icon,
}: {
  dt: DateTime | null
  tone: PillTone
  Icon: typeof Rocket
}) {
  return (
    <div className={cn('relative flex h-44 w-full shrink-0 items-end p-4', toneClass(tone))}>
      <Icon size={28} weight="duotone" className="absolute right-4 top-4 opacity-60" />
      {dt ? (
        <div className="leading-none">
          <p className="text-[44px] font-semibold tracking-[-0.03em]">{dt.toFormat('d')}</p>
          <p className="mt-1 text-[14px] font-medium opacity-80">
            {dt.toFormat('cccc, LLLL')}
            {dt.hour || dt.minute ? ` · ${dt.toFormat('h:mm a')}` : ''}
          </p>
        </div>
      ) : (
        <p className="text-[15px] font-medium opacity-80">Date to be announced</p>
      )}
    </div>
  )
}
