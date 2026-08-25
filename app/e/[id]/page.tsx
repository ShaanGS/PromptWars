import type { Metadata } from 'next'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DateTime } from 'luxon'
import {
  ArrowUpRight,
  CalendarPlus,
  Clock,
  DownloadSimple,
  Globe,
  HourglassHigh,
  MapPin,
  Ticket,
} from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { getPublicEvent } from '@/lib/queries'
import { formatRange, googleCalendarUrl, relativeDeadline } from '@/lib/dates/format'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { bestImageUrl } from '@/lib/images'
import { siteOrigin } from '@/lib/site'
import { displayText, displayTitle, snippet } from '@/lib/text'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/brand-mark'
import { SOURCE_LABELS, categoryOf } from '@/components/event-card'
import { EventImage } from '@/components/feed/event-image'
import { Pill } from '@/components/ui/pill'
import { DataRow, toneClass } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'

/**
 * /e/:id -- the one page a non-member may see.
 *
 * A member shares an event with someone who is not (yet) in Olvable, and the
 * link they get has to be worth opening: what it is, when, where, and the
 * way in. That is the whole page. Deliberately thinner than /event/:id --
 * no score, no band, no "for you", no actions -- because those say things
 * about the member, not the event. The legal rule holds here as it does
 * inside: an excerpt and a link out, never the organiser's prose.
 *
 * Most of the value is the unfurl: generateMetadata gives WhatsApp and
 * iMessage a title, a line and the banner, so the link reads as the event
 * before anyone taps it.
 */

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const event = await getPublicEvent(id)
  // Decided here, not only in the page: the root loading.tsx streams the
  // shell first, so a notFound() thrown from the page body arrives after a
  // 200 has been sent -- the not-found UI with a success status, which a
  // crawler or link preview would happily keep. Metadata runs before the
  // first byte, so here it is a real 404.
  if (!event) notFound()

  const title = displayTitle(event.title)
  const when = formatRange(
    event.starts_at_local,
    event.ends_at_local,
    event.date_precision as never,
  )
  const place = event.is_online ? 'Online' : (event.area ?? event.city ?? event.venue ?? null)
  const description = [when, place].filter(Boolean).join(' · ') || 'Shared from Olvable'
  const image = bestImageUrl(event.image_url)
  const origin = siteOrigin()

  return {
    metadataBase: new URL(origin),
    title: `${title} · Olvable`,
    description,
    alternates: { canonical: `/e/${event.id}` },
    // The root layout says noindex for the member app; this page is the
    // exception, and says so explicitly so the merge does not inherit it.
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Olvable',
      title,
      description,
      url: `/e/${event.id}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

function NotStated() {
  return <span className="text-ink-3">Not stated</span>
}

export default async function PublicEventPage({ params }: Props) {
  await connection()
  const { id } = await params
  const [event, user] = await Promise.all([getPublicEvent(id), getSessionUser()])
  if (!event) notFound()

  const title = displayTitle(event.title)
  const source = SOURCE_LABELS[event.source_id] ?? event.source_id
  const category = categoryOf(event as never)
  const image = bestImageUrl(event.image_url)
  const deadline = relativeDeadline(event.registration_deadline)
  const urgent = deadline !== null && deadline.days >= 0 && deadline.days <= 7
  const closes = deadline ? deadline.label.replace(/^closes\s*/, '') : null
  const closesSentence = closes ? closes.charAt(0).toUpperCase() + closes.slice(1) : null

  const dt = event.starts_at_local
    ? DateTime.fromISO(event.starts_at_local, { zone: DEFAULT_TZ })
    : null
  const when = formatRange(
    event.starts_at_local,
    event.ends_at_local,
    event.date_precision as never,
  )
  const whenLabel = dt ? `${dt.toFormat('cccc')}, ${when}` : when || null
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
    <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      {/* Signed-in members arrive inside the shell, which already carries
          the brand; signed-out visitors get a small standalone header. */}
      {!user ? (
        <header className="mb-6 flex items-center justify-between">
          <Link href="/login" aria-label="Olvable">
            <Wordmark size="md" />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Sign in
          </Link>
        </header>
      ) : (
        <p className="mb-4 text-[13.5px] text-ink-3">
          This is the public page for this event — what someone without an account sees.{' '}
          <Link
            href={`/event/${event.id}`}
            className="font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
          >
            Open the full page
          </Link>
        </p>
      )}

      <article>
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
                  <p className="text-[56px] font-semibold tracking-[-0.03em]">{dt.toFormat('d')}</p>
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
          {urgent && closes ? <Pill tone="warning">Closes {closes}</Pill> : null}
          <Pill tone="outline">via {source}</Pill>
        </div>

        <h1 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[34px]">
          {title}
        </h1>
        {event.organizer ? (
          <p className="mt-2 text-[15px] text-ink-2">by {displayText(event.organizer)}</p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <DataRow
            icon={<Clock weight="duotone" />}
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
          {/* When and Where earn a "Not stated" -- their absence is itself
              information. An unknown price is just filler. */}
          {price ? (
            <DataRow icon={<Ticket weight="duotone" />} label="Price" value={price} tone="mint" />
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

        <div className="mt-5 grid gap-2">
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
                href={`/e/${event.id}/ics`}
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
        </div>

        <section className="mt-8">
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
        </section>
      </article>

      {!user ? (
        <footer className="mt-10 rounded-card border border-line bg-surface p-5 text-center shadow-card">
          <div className="flex justify-center">
            <Wordmark size="sm" />
          </div>
          <p className="mt-3 text-[14.5px] text-ink-2">
            Found on Olvable — events across Tamil Nadu, for people who build things.
          </p>
          <p className="mt-1 text-[13.5px] text-ink-3">
            Invite-only while it grows. Ask the person who sent you this.
          </p>
          <Link
            href="/login"
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
          >
            Member? Sign in
          </Link>
        </footer>
      ) : null}
    </main>
  )
}
