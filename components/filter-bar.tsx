import Link from 'next/link'
import { MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr'
import { activeCount, toggleHref, type Filters } from '@/lib/filters'
import { IconInput } from '@/components/ui/field'
import { chipClass, ChipRow } from '@/components/ui/chip'

/**
 * Search and filter chips. Every chip is a URL, so the back button works, a
 * view is shareable, and the page stays a server component.
 */
export function FilterBar({
  filters,
  sources,
  base = '/',
  placeholder = 'Search events, organisers, venues',
  whenLabels = { week: 'This week', month: 'This month' },
  offlineLabel = 'In person',
  showTop = true,
}: {
  filters: Filters
  sources: Array<{ id: string; label: string }>
  /** The page the chips and the search form point at. */
  base?: string
  placeholder?: string
  /**
   * What `when` means on this page. On /hackathons it narrows the entry
   * deadline rather than the start, so it reads "Closes this week".
   */
  whenLabels?: { week: string; month: string }
  /**
   * What the in-person chip is called. On /hackathons every in-person entry
   * is in Tamil Nadu by construction, and saying so is more useful than
   * saying "In person".
   */
  offlineLabel?: string
  /** The Top picks chip is a feed device; pages that ignore the relevance
   *  floor (hackathons) would offer a filter that contradicts the list. */
  showTop?: boolean
}) {
  // No 'Free' chip: AllEvents ships an empty offers array, so every event is
  // price_type 'unknown' and the filter would always return nothing.
  const chips: Array<{ label: string; href: string; on: boolean }> = [
    {
      label: whenLabels.week,
      href: toggleHref(filters, 'when', 'week', base),
      on: filters.when === 'week',
    },
    {
      label: whenLabels.month,
      href: toggleHref(filters, 'when', 'month', base),
      on: filters.when === 'month',
    },
    {
      label: offlineLabel,
      href: toggleHref(filters, 'offlineOnly', undefined, base),
      on: filters.offlineOnly,
    },
    ...(showTop
      ? [
          {
            label: 'Top picks',
            href: toggleHref(filters, 'topOnly', undefined, base),
            on: filters.topOnly,
          },
        ]
      : []),
    ...sources.map((s) => ({
      label: s.label,
      href: toggleHref(filters, 'source', s.id, base),
      on: filters.source === s.id,
    })),
  ]
  const active = activeCount(filters)

  return (
    <div className="space-y-3">
      <form action={base} role="search" className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <IconInput
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={placeholder}
            aria-label="Search events"
            icon={<MagnifyingGlass weight="bold" />}
            className="rounded-full bg-surface"
          />
        </div>
        {filters.when !== 'all' ? <input type="hidden" name="when" value={filters.when} /> : null}
        {filters.offlineOnly ? <input type="hidden" name="offline" value="1" /> : null}
        {filters.topOnly ? <input type="hidden" name="top" value="1" /> : null}
        {filters.source ? <input type="hidden" name="src" value={filters.source} /> : null}
        {filters.sort ? <input type="hidden" name="sort" value={filters.sort} /> : null}
        <button
          type="submit"
          className="hidden h-11 shrink-0 items-center rounded-full bg-ink px-5 text-[14.5px] font-medium text-white hover:bg-ink/85 sm:inline-flex"
        >
          Search
        </button>
      </form>

      <ChipRow>
        {chips.map((c) => (
          <Link key={c.label} href={c.href} scroll={false} className={chipClass(c.on)}>
            {c.label}
          </Link>
        ))}
        {active > 0 ? (
          <Link
            href={base}
            scroll={false}
            className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[14px] font-medium text-ink-2 hover:text-ink"
          >
            <X size={14} weight="bold" />
            Clear {active}
          </Link>
        ) : null}
      </ChipRow>
    </div>
  )
}
