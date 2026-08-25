import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CaretLeft, CaretRight, ListBullets } from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { activeCount, pageHref, parseFilters, parsePage, toggleHref } from '@/lib/filters'
import { getSourceChips, listEvents } from '@/lib/queries'
import { getInterests } from '@/lib/interests'
import { fitFor } from '@/lib/ranking'
import { Page, PageHeader } from '@/components/shell/page-header'
import { FilterBar } from '@/components/filter-bar'
import { EventCard } from '@/components/event-card'
import { EmptyState } from '@/components/ui/bits'
import { Segmented } from '@/components/ui/segmented'
import { buttonVariants } from '@/components/ui/button'

const BASE = '/events'

/**
 * /events -- every upcoming event in scope, flat and paginated.
 *
 * The feed is a ranked triage surface capped at 60; this is where the rest
 * live. Same filters and search, one list, no tiers, no duplicate
 * collapsing. Soonest-first by default because this is a browse view;
 * "Best match" gives the feed's order for the whole set.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const filters = parseFilters(params)
  const sort = filters.sort === 'rank' ? 'rank' : 'date'
  const requested = parsePage(params)

  // "All" means all: the feed's 40-point relevance floor does not apply
  // here. The band pill on each card says what the model thought.
  const [list, sources, interests] = await Promise.all([
    listEvents(user.id, { ...filters, showLow: true }, { sort, page: requested }),
    getSourceChips(user.id),
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
        title="All events"
        subtitle={
          total
            ? `${total} upcoming event${total === 1 ? '' : 's'}${filtersActive ? ' match' : ' across Tamil Nadu'}, including the ones the feed hides. The feed ranks; this lists.`
            : 'Nothing upcoming matches.'
        }
        actions={
          <Segmented
            aria-label="Sort"
            size="sm"
            value={sort}
            options={[
              { value: 'date', label: 'Soonest', href: toggleHref(filters, 'sort', '', BASE) },
              {
                value: 'rank',
                label: 'Best match',
                href: toggleHref(filters, 'sort', 'rank', BASE),
              },
            ]}
          />
        }
      />

      <div className="mt-6">
        <FilterBar
          filters={filters}
          sources={sources}
          base={BASE}
          placeholder="Search titles, organisers, venues, descriptions"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ListBullets weight="duotone" />}
          title={filtersActive ? 'Nothing matches these filters' : 'Nothing upcoming'}
          body={
            filtersActive ? 'Try fewer filters, or clear them.' : 'The next ingest runs at 7am IST.'
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
