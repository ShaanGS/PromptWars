import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { ArrowRight, CaretDown } from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { activeCount, pageHref, parseFilters, toggleHref } from '@/lib/filters'
import { getDashboardData, type EventRow } from '@/lib/queries'
import { getInterests } from '@/lib/interests'
import { rankEvents } from '@/lib/ranking'
import { DEFAULT_TZ } from '@/lib/dates/types'
import { markAllSeen } from '../actions'
import { Page, PageHeader } from '@/components/shell/page-header'
import { FilterBar } from '@/components/filter-bar'
import { EventCard } from '@/components/event-card'
import { HealthStrip } from '@/components/health-strip'
import { SectionHeading } from '@/components/ui/card'
import { EmptyState, StatTile } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'

function greeting(): string {
  const hour = DateTime.now().setZone(DEFAULT_TZ).hour
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The feed.
 *
 * Three tiers, and only the first two are open by default: Top picks (80+)
 * and Worth a look (60–79). Everything below 60 is behind a single "show"
 * link -- those events are not deleted and not hidden for good, but a feed
 * that opens on a concert and a marathon is one you stop opening. The real
 * fix (per-user interests and an onboarding) is the next feature session;
 * this is the honest default until then.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const filters = parseFilters(await searchParams)

  let data
  let interests = null
  try {
    ;[data, interests] = await Promise.all([
      getDashboardData(user.id, filters),
      getInterests(user.id),
    ])
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Not connected" subtitle="Could not reach the database." />
        <pre className="mt-6 overflow-x-auto rounded-card border border-line bg-surface p-4 font-mono text-[13px] text-ink-2">
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </Page>
    )
  }

  const { closingSoon, totalActive, filteredCount, unseenCount, health } = data
  const liveSources = health.filter((s) => s.enabled).length
  // Per-user fit on top of the global quality score. Tiers use the fitted
  // rank, so "Top picks" means "great, and yours".
  const personal = interests && interests.tags.length > 0 ? interests : null
  const events = rankEvents(data.events, personal)
  const rankOf = (e: EventRow) => e.fit?.rank ?? e.relevance_score ?? 0
  const top = events.filter((e) => rankOf(e) >= 80)
  const worth = events.filter((e) => rankOf(e) >= 60 && rankOf(e) < 80)
  const rest = events.filter((e) => rankOf(e) < 60)
  const shown = closingSoon.length + events.length
  const filtersActive = activeCount(filters) > 0
  // Deadline sources (Devpost, Unstop) are not in this list, so a chip for
  // them would filter the feed down to nothing. They live on /hackathons.
  const sourceChips = health
    .filter((s) => s.enabled && !s.muted && s.kind !== 'deadlines')
    .map((s) => ({ id: s.id, label: s.display_name }))

  return (
    <Page>
      <PageHeader
        title={greeting()}
        subtitle={
          personal
            ? `${totalActive} events across Tamil Nadu, ranked for what you're into.`
            : `${totalActive} events across Tamil Nadu, ranked for you.`
        }
        actions={
          unseenCount > 0 ? (
            <form action={markAllSeen}>
              <button type="submit" className={buttonVariants({ size: 'sm' })}>
                Mark all {unseenCount} seen
              </button>
            </form>
          ) : null
        }
      />

      <div className="mt-6">
        <FilterBar filters={filters} sources={sourceChips} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Link
          href="/events"
          className="rounded-card transition-opacity hover:opacity-90"
          aria-label={`Browse all ${totalActive} events`}
        >
          <StatTile
            label="Upcoming"
            value={totalActive}
            hint="in scope · browse all →"
            tone="lilac"
            className="h-full"
          />
        </Link>
        <StatTile label="Top picks" value={top.length} hint="scored 80+" tone="sky" />
        <StatTile
          label="Closing soon"
          value={closingSoon.length}
          hint="within 7 days"
          tone={closingSoon.length ? 'lemon' : 'neutral'}
        />
        <StatTile label="New" value={unseenCount} hint="since you looked" tone="neutral" />
      </div>

      {shown === 0 ? (
        <EmptyState
          className="mt-8"
          title={filtersActive ? 'Nothing matches these filters' : 'Nothing here yet'}
          body={
            filtersActive ? 'Try fewer filters, or clear them.' : 'The next ingest runs at 7am IST.'
          }
          action={
            filtersActive ? (
              <Link href="/" className={buttonVariants({ variant: 'primary' })}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {closingSoon.length ? (
        <Section
          title="Closing soon"
          aside="registration closes within 7 days"
          events={closingSoon}
        />
      ) : null}

      {top.length ? (
        <Section
          title="Top picks"
          aside={
            personal ? 'great, and yours' : 'founders, investors or serious builders in the room'
          }
          events={top}
        />
      ) : null}

      {worth.length ? <Section title="Worth a look" aside="scored 60–79" events={worth} /> : null}

      {rest.length ? (
        filters.everything ? (
          <Section title="Everything else" aside="below 60, still in scope" events={rest} />
        ) : (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-line-strong bg-surface px-5 py-4">
            <p className="text-[14.5px] text-ink-2">
              <span className="font-medium text-ink">{rest.length} more</span> scored below 60 —
              lower confidence they are for you.
            </p>
            <Link
              href={toggleHref(filters, 'everything')}
              scroll={false}
              className={buttonVariants({ size: 'sm' })}
            >
              Show them
              <CaretDown weight="bold" />
            </Link>
          </div>
        )
      ) : null}

      {totalActive > shown ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-5 py-4">
          <p className="text-[14.5px] text-ink-2">
            Showing <span className="font-medium text-ink">{shown}</span> of {totalActive} upcoming
            events, ranked.
          </p>
          <Link href={pageHref(filters, 1, '/events')} className={buttonVariants({ size: 'sm' })}>
            Browse all {totalActive}
            <ArrowRight weight="bold" />
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <HealthStrip health={health} />
        <span className="text-[13px] text-ink-3">
          {liveSources} of {health.length} sources live
          {filteredCount > 0 ? ` · ${filteredCount} filtered out, none deleted` : ''}
        </span>
      </div>
    </Page>
  )
}

function Section({
  icon,
  title,
  aside,
  events,
}: {
  icon?: React.ReactNode
  title: string
  aside?: string
  events: EventRow[]
}) {
  return (
    <section className="mt-8">
      <SectionHeading icon={icon} title={title} aside={aside} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} dismissOnSkip />
        ))}
      </div>
    </section>
  )
}
