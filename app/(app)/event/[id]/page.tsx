import { connection } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { DateTime } from 'luxon'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarPlus,
  Clock,
  DownloadSimple,
  Globe,
  HourglassHigh,
  MapPin,
  Ticket,
  UsersThree,
  Warning,
} from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { getEventById } from '@/lib/queries'
import { getInterests } from '@/lib/interests'
import { squadsForEvent } from '@/lib/team/squads-for-event'
import { fitFor } from '@/lib/ranking'
import { formatRange, googleCalendarUrl, relativeDeadline } from '@/lib/dates/format'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { bandFor } from '@/lib/theme'
import { bestImageUrl } from '@/lib/images'
import { displayText, displayTitle, snippet } from '@/lib/text'
import { cn } from '@/lib/utils'
import { Page } from '@/components/shell/page-header'
import { SOURCE_LABELS, categoryOf } from '@/components/event-card'
import { EventImage } from '@/components/feed/event-image'
import { CardActions } from '@/components/card-actions'
import { SquadCard } from '@/components/team/squad-card'
import { ShareButton } from '@/components/share/share-button'
import { Pill } from '@/components/ui/pill'
import { DataRow, toneClass } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'

/**
 * The page a card links into.
 *
 * The card is a triage surface -- "is this worth my time?" in two seconds.
 * This answers the follow-up: every fact we hold, why it ranked where it
 * did, and where the listing came from, including the duplicates the card
 * collapsed. Missing facts say "Not stated" rather than vanishing, because
 * a gap is information about the source.
 *
 * What it deliberately does NOT do is reprint the organiser's description.
 * Facts are ours to list; their prose is theirs. We show an excerpt and
 * send you to the listing for the rest.
 */
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { id } = await params
  const [detail, interests] = await Promise.all([getEventById(user.id, id), getInterests(user.id)])
  if (!detail) notFound()

  const { event, alsoListedOn } = detail
  const squads = await squadsForEvent(event.id)
  const title = displayTitle(event.title)
  const source = SOURCE_LABELS[event.source_id] ?? event.source_id
  const band = bandFor(event.relevance_score)
  const category = categoryOf(event)
  const fit = fitFor(event, interests && interests.tags.length > 0 ? interests : null)
  const deadline = relativeDeadline(event.registration_deadline)
  const urgent = deadline !== null && deadline.days >= 0 && deadline.days <= 7
  // relativeDeadline's label carries the verb ("closes today"); the pill and
  // the fact row supply their own, so strip it here.
  const closes = deadline ? deadline.label.replace(/^closes\s*/, '') : null
  const closesSentence = closes ? closes.charAt(0).toUpperCase() + closes.slice(1) : null
  const image = bestImageUrl(event.image_url)
  const dt = event.starts_at_local
    ? DateTime.fromISO(event.starts_at_local, { zone: DEFAULT_TZ })
    : null

  const when = formatRange(
    event.starts_at_local,
    event.ends_at_local,
    event.date_precision as never,
  )
  const whenLabel = dt ? `${dt.toFormat('cccc')}, ${when}` : when || null
  // Venue, area, city -- deduped, because AllEvents often fills area and
  // city with the same word and "Chennai, Chennai" reads like a bug.
  const where = event.is_online
    ? 'Online'
    : [event.venue, event.area, event.city]
        .filter((s): s is string => Boolean(s))
        .map((s) => displayText(s).trim())
        .filter((s, i, all) => all.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i)
        .join(', ') || null
  const price =
    event.price_type === 'free'
      ? 'Free'
      : event.price_amount
        ? `₹${Math.round(event.price_amount)}`
        : null
  const about = snippet(event.description)

  const calendarUrl = googleCalendarUrl({
    title,
    local: event.starts_at_local,
    endLocal: event.ends_at_local,
    precision: event.date_precision as never,
    venue: event.venue ?? event.city,
    url: event.url,
  })

  return (
    <Page className="max-w-[1080px]">
      <Link
        href="/"
        className="inline-flex h-9 items-center gap-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="bold" />
        Back to the feed
      </Link>

      {/* An archived or filtered event stays reachable by link, but saying
          nothing would let a stale listing read as current. */}
      {event.status !== 'active' ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-ctl bg-warning-soft px-4 py-3 text-[14px] text-warning-ink">
          <Warning size={18} weight="duotone" className="mt-px shrink-0" />
          <span>
            This listing is no longer in the feed
            {event.status === 'filtered_geo'
              ? ' — it was filtered as outside Tamil Nadu.'
              : event.status === 'filtered_quality'
                ? ' — it was filtered on quality.'
                : `. Status: ${event.status}.`}
          </span>
        </div>
      ) : null}

      {/* One grid, three cells. On a phone they stack in DOM order: header,
          then the action card, then the body. From lg the action card moves
          to a sticky right column beside both. */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-10 lg:gap-y-8">
        <header className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            {image ? (
              <EventImage src={image} alt="" />
            ) : (
              <div
                className={cn(
                  'relative flex aspect-[16/9] w-full items-end p-5',
                  toneClass(category.tone),
                )}
              >
                <category.Icon
                  size={32}
                  weight="duotone"
                  className="absolute right-5 top-5 opacity-60"
                />
                {dt ? (
                  <div className="leading-none">
                    <p className="text-[56px] font-semibold tracking-[-0.03em]">
                      {dt.toFormat('d')}
                    </p>
                    <p className="mt-1.5 text-[15px] font-medium opacity-80">
                      {dt.toFormat('cccc, LLLL')}
                      {dt.hour || dt.minute ? ` · ${dt.toFormat('h:mm a')}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-[15px] font-medium opacity-80">Date to be announced</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            <Pill tone={category.tone}>{category.label}</Pill>
            {band.label ? (
              <Pill tone="neutral" className={band.chip}>
                <span className={cn('size-1.5 rounded-full', band.dot)} />
                {band.label}
                {event.relevance_score !== null ? (
                  <span className="tabular-nums opacity-60">{event.relevance_score}</span>
                ) : null}
              </Pill>
            ) : null}
            {fit.reasons.length ? (
              <Pill tone="accent-soft">For you · {fit.reasons.slice(0, 2).join(', ')}</Pill>
            ) : null}
            {urgent && closes ? <Pill tone="warning">Closes {closes}</Pill> : null}
            <Pill tone="outline">via {source}</Pill>
          </div>

          <h1 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[34px]">
            {title}
          </h1>
          {event.organizer ? (
            <p className="mt-2 text-[15px] text-ink-2">by {displayText(event.organizer)}</p>
          ) : null}
        </header>

        <aside className="min-w-0 self-start lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
            <CardActions eventId={event.id} state={(event.action_state ?? null) as never} />
            <div className="mt-3 grid gap-2">
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full' })}
              >
                Open on {source}
                <ArrowUpRight weight="bold" />
              </a>
              {calendarUrl ? (
                // Equal halves (minmax(0,…) so a track can shrink below its
                // text -- a bare track pushed .ics through the card edge).
                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
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
                    Google Calendar
                  </a>
                  <a
                    href={`/event/${event.id}/ics`}
                    title="Download .ics for Apple Calendar, Outlook and others"
                    className={buttonVariants({
                      variant: 'secondary',
                      size: 'md',
                      className: 'w-full',
                    })}
                  >
                    <DownloadSimple weight="bold" />
                    .ics
                  </a>
                </div>
              ) : null}
              {/* Public link -- the one page a non-member can open (3.9). */}
              <ShareButton eventId={event.id} title={title} />
            </div>

            <div className="mt-4 grid gap-2">
              <DataRow
                icon={<Clock weight="duotone" />}
                // A deadline listing's dates are a submission window, not a
                // start time, so labelling them "When" reads as "this happens
                // on 23 Jul" for something you enter until 25 Aug.
                label={event.date_kind === 'deadline' ? 'Submissions' : 'When'}
                value={whenLabel ?? <NotStated />}
                tone={whenLabel ? 'sky' : 'neutral'}
              />
              <DataRow
                icon={event.is_online ? <Globe weight="duotone" /> : <MapPin weight="duotone" />}
                label="Where"
                value={where ?? <NotStated />}
                tone={where ? (event.is_online ? 'lilac' : 'rose') : 'neutral'}
              />
              {/* When and Where earn a "Not stated" -- their absence is
                  itself information. An unknown price is just filler. */}
              {price ? (
                <DataRow
                  icon={<Ticket weight="duotone" />}
                  label="Price"
                  value={price}
                  tone="mint"
                />
              ) : null}
              {deadline ? (
                <DataRow
                  icon={<HourglassHigh weight="duotone" />}
                  label="Registration closes"
                  value={closesSentence}
                  tone={urgent ? 'lemon' : 'neutral'}
                />
              ) : null}
            </div>
          </div>
        </aside>

        {/* The loop the product exists to close: a listing is not just
            something to read, it is something to form a team for. Squads
            already aiming at this event are the social proof; the button is
            the way in, and it arrives at the form with the event chosen. */}
        <section className="min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
              {squads.length
                ? `${squads.length} team${squads.length === 1 ? '' : 's'} forming here`
                : 'No teams yet'}
            </h2>
            <Link
              href={`/teams/new?event=${event.id}`}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              <UsersThree weight="bold" />
              Post a team for this
            </Link>
          </div>

          {squads.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {squads.map((squad) => (
                <li key={squad.id}>
                  <SquadCard squad={squad} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[15px] text-ink-3">
              Nobody has posted what they need for this one. Say what you are building and which
              role is missing, and Guild ranks the pool against it.
            </p>
          )}
        </section>

        <section className="min-w-0 lg:col-start-1 lg:row-start-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">About</h2>
          {about ? (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{about}</p>
          ) : (
            <p className="mt-2 text-[15px] text-ink-3">The listing has no description.</p>
          )}
          <p className="mt-3 text-[13.5px] text-ink-3">
            {about ? 'Excerpt from the organiser’s listing. ' : ''}
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-0.5 font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
            >
              Read the full listing on {source}
              <ArrowUpRight size={13} weight="bold" />
            </a>
          </p>

          {/* Why it scored what it scored. The rubric is opinionated, so
              showing its reasoning is what makes a low score arguable rather
              than arbitrary. */}
          {event.relevance_reason ? (
            <div className="mt-8">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                Why it&apos;s ranked here
              </h2>
              <p className="mt-2 border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-ink-2">
                {event.relevance_reason}
              </p>
            </div>
          ) : null}

          {event.tags?.length ? (
            <div className="mt-8">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Tags</h2>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <Pill key={tag} tone="neutral" size="sm">
                    {tag}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}

          {alsoListedOn.length ? (
            <div className="mt-8">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                Also listed on
              </h2>
              <p className="mt-1 text-[13.5px] text-ink-3">
                The feed collapses these into one card.
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {alsoListedOn.map((d) => (
                  <li key={d.id}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={buttonVariants({ variant: 'secondary', size: 'sm', pill: true })}
                    >
                      {SOURCE_LABELS[d.source_id] ?? d.source_id}
                      <ArrowUpRight weight="bold" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </Page>
  )
}

/** "Not stated" in the quiet colour -- a gap the source left, not us. */
function NotStated() {
  return <span className="font-normal text-ink-3">Not stated</span>
}
