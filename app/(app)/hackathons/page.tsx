import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CaretLeft, CaretRight, Trophy } from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { activeCount, pageHref, parseFilters, parsePage } from '@/lib/filters'
import { getSourceChips, listHackathons } from '@/lib/queries'
import { getInterests } from '@/lib/interests'
import { fitFor } from '@/lib/ranking'
import { Page, PageHeader } from '@/components/shell/page-header'
import { FilterBar } from '@/components/filter-bar'
import { EventCard } from '@/components/event-card'
import { EmptyState } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'

const BASE = '/hackathons'

/**
 * /hackathons -- the things you enter before a cutoff, closing soonest first.
 *
 * This is a separate page rather than a slice of the feed for two reasons
 * that are both about the data, not the design. Devpost and Unstop are
 * national and mostly online, so merging them would bury the Chennai rooms
 * the feed exists to surface. And they are deadline listings: `starts_at` is
 * when the submission window opened, so an entry that is open right now has a
 * start in the past and every `starts_at >= now` list drops it. Here the
 * ordering key is `registration_deadline` throughout.
 */
export default async function HackathonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const filters = parseFilters(params)
  const requested = parsePage(params)

  const [list, sources, interests] = await Promise.all([
    listHackathons(user.id, filters, { page: requested }),
    getSourceChips(user.id, 'deadlines'),
    getInterests(user.id),
  ])
  const personal = interests && interests.tags.length > 0 ? interests : null
  const rows = list.rows.map((e) => ({ ...e, fit: fitFor(e, personal) }))

  const { total, page, pageSize } = list
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(page * pageSize, total)
  const filtersActive = activeCount(filters) > 0

  return (
    <Page>
      <PageHeader
        title="Hackathons"
        subtitle={
          total
            ? `${total} open entr${total === 1 ? 'y' : 'ies'}${filtersActive ? ' matching' : ''}, closing soonest first. Everything you can turn up to in person is in Tamil Nadu; online ones are open from anywhere, so they are here if they are technical. From Devpost and Unstop.`
            : 'Nothing open right now.'
        }
      />

      <div className="mt-6">
        <FilterBar
          filters={filters}
          sources={sources}
          base={BASE}
          placeholder="Search hackathons, organisers, themes"
          whenLabels={{ week: 'Closes this week', month: 'Closes this month' }}
          offlineLabel="In Tamil Nadu"
          // The list ignores the relevance floor, so a "Top picks" chip would
          // contradict it. See listHackathons.
          showTop={false}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Trophy weight="duotone" />}
          title={filtersActive ? 'Nothing matches these filters' : 'Nothing open right now'}
          body={
            filtersActive
              ? 'Try fewer filters, or clear them.'
              : 'Devpost and Unstop are re-read every morning at 7am IST.'
          }
          action={
            filtersActive ? (
              <Link href={BASE} className={buttonVariants({ variant: 'primary' })}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>

          <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pages">
            {page > 1 ? (
              <Link
                href={pageHref(filters, page - 1, BASE)}
                className={buttonVariants({ size: 'sm' })}
              >
                <CaretLeft weight="bold" />
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-[13.5px] text-ink-2">
              <span className="font-medium text-ink">
                {from}–{to}
              </span>{' '}
              of {total}
              {pages > 1 ? ` · page ${page} of ${pages}` : ''}
            </span>
            {page < pages ? (
              <Link
                href={pageHref(filters, page + 1, BASE)}
                className={buttonVariants({ size: 'sm' })}
              >
                Next
                <CaretRight weight="bold" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </Page>
  )
}
