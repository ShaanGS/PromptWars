import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  BookmarkSimple,
  CalendarBlank,
  CheckCircle,
  ClockCounterClockwise,
} from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { getSavedEvents, type EventRow } from '@/lib/queries'
import { effectiveInstant } from '@/lib/events'
import { Page, PageHeader } from '@/components/shell/page-header'
import { EventCard } from '@/components/event-card'
import { SectionHeading } from '@/components/ui/card'
import { EmptyState, StatTile } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'

/**
 * Everything the user chose to keep -- the list they built by hand.
 *
 * Split into Going (registered / going) and Saved (interested), because
 * "which events am I actually attending?" and "what was that thing I
 * flagged?" are different questions. Past events drop into a collapsed
 * section at the bottom so the page opens on what is still ahead; they
 * are kept, not deleted, because "what did I go to in July?" is a real
 * question too.
 */
export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const showPast = params.past === '1'
  const events = await getSavedEvents(user.id)

  // An event is "past" once the instant that matters has gone by -- the start
  // for a normal listing, the cutoff for a deadline one, since a hackathon
  // whose submission window opened in July but closes on Friday has not
  // happened yet. Undated events count as upcoming.
  const nowIso = new Date().toISOString()
  const isPast = (e: EventRow) => {
    const at = effectiveInstant(e)
    return at !== null && at < nowIso
  }
  // The query orders by start, so deadline listings arrive in the wrong place;
  // re-sort on the same instant the split uses.
  const byWhen = (a: EventRow, b: EventRow) =>
    (effectiveInstant(a) ?? '').localeCompare(effectiveInstant(b) ?? '')
  const upcoming = events.filter((e) => !isPast(e)).sort(byWhen)
  const past = events.filter(isPast).sort(byWhen).reverse() // most recent first

  const isGoing = (e: EventRow) =>
    ['registered', 'going', 'attended'].includes(e.action_state ?? '')
  const going = upcoming.filter(isGoing)
  const saved = upcoming.filter((e) => e.action_state === 'interested')

  const subtitle = events.length
    ? [
        going.length ? `${going.length} going` : null,
        saved.length ? `${saved.length} saved` : null,
        past.length ? `${past.length} past` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'The events you marked Going or saved from the feed.'

  return (
    <Page>
      <PageHeader
        title="Saved"
        subtitle={subtitle}
        actions={
          events.length ? (
            <Link href="/calendar" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <CalendarBlank weight="duotone" />
              Open calendar
            </Link>
          ) : null
        }
      />

      {!events.length ? (
        <EmptyState
          className="mt-8"
          icon={<BookmarkSimple weight="duotone" />}
          title="Nothing saved yet"
          body="Tap Going or the bookmark on any event and it lands here — and on your calendar."
          action={
            <Link href="/" className={buttonVariants({ variant: 'primary' })}>
              Browse events
            </Link>
          }
        />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            <StatTile label="Going" value={going.length} hint="upcoming" tone="sky" />
            <StatTile label="Saved" value={saved.length} hint="to decide" tone="lilac" />
            <StatTile label="Past" value={past.length} hint="already happened" tone="neutral" />
          </div>

          {going.length ? (
            <section className="mt-8">
              <SectionHeading
                icon={<CheckCircle weight="duotone" />}
                title="Going"
                aside="soonest first"
              />
              <Grid events={going} />
            </section>
          ) : null}

          {saved.length ? (
            <section className="mt-8">
              <SectionHeading
                icon={<BookmarkSimple weight="duotone" />}
                title="Saved"
                aside="soonest first"
              />
              <Grid events={saved} />
            </section>
          ) : null}

          {!going.length && !saved.length ? (
            <EmptyState
              className="mt-8"
              icon={<CalendarBlank weight="duotone" />}
              title="Nothing coming up"
              body="Everything you saved has already happened. The feed has what's next."
              action={
                <Link href="/" className={buttonVariants({ variant: 'primary' })}>
                  Browse events
                </Link>
              }
            />
          ) : null}

          {past.length ? (
            <section className="mt-8">
              <SectionHeading
                icon={<ClockCounterClockwise weight="duotone" />}
                title={`Past (${past.length})`}
                aside={
                  showPast ? (
                    <Link
                      href="/saved"
                      className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink"
                    >
                      Hide
                    </Link>
                  ) : (
                    <Link
                      href="/saved?past=1"
                      className="inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink"
                    >
                      Show them
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                  )
                }
              />
              {showPast ? (
                <Grid events={past} />
              ) : (
                <p className="text-[14px] text-ink-3">
                  Kept, not shown — they&apos;ve already happened.
                </p>
              )}
            </section>
          ) : null}
        </>
      )}
    </Page>
  )
}

function Grid({ events }: { events: EventRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  )
}
