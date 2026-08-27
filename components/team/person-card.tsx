import Link from 'next/link'
import { ArrowUpRight, Clock, SealCheck, UserCircle } from '@phosphor-icons/react/dist/ssr'
import { toneClass } from '@/components/ui/bits'
import { Pill, toneFor } from '@/components/ui/pill'
import { summariseAvailability } from '@/lib/team/availability-summary'
import { toWindows } from '@/lib/team/mappers'
import { cn } from '@/lib/utils'

/** Skills past this many fold into a "+N" pill so cards stay one height. */
const SKILLS_SHOWN = 4

export type PersonCardSkill = { skill: string; proof_url: string | null }

/**
 * A person, on the same skeleton as an event card.
 *
 * Deliberately not its own design. The event cards are the part of this app
 * that reads as finished, and the reason is structural rather than decorative:
 * a tall media block gives the card presence, one number is the hero inside
 * it, and everything below is a fixed rhythm -- title, meta line, pills, a
 * hairline, then the action. A thin colour strip and a stack of equal-weight
 * rows cannot compete with that, however the colours are chosen.
 *
 * So a person gets the same frame: initials where the date goes, the Guild
 * Score where the relevance band goes, availability where the venue goes.
 * Two card types, one grammar, no new vocabulary for the eye to learn.
 */
export function PersonCard({
  handle,
  name,
  dept,
  year,
  lookingFor,
  availabilityWindows,
  score,
  claims,
}: {
  handle: string
  name: string
  dept: string | null
  year: number | null
  lookingFor?: string | null
  availabilityWindows: unknown
  /** Guild Score, already rounded to 0-100. */
  score: number
  /** Backed-first, strongest-first -- the order the pills are shown in. */
  claims: PersonCardSkill[]
}) {
  const meta = [dept, year ? `Year ${year}` : null].filter(Boolean).join(' · ') || `@${handle}`
  const shown = claims.slice(0, SKILLS_SHOWN)
  const rest = claims.length - shown.length
  const backed = claims.filter((c) => c.proof_url).length
  const availability = summariseAvailability(toWindows(availabilityWindows))
  const href = `/p/${handle}`

  const initials =
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-line-strong">
      <Link href={href} className="relative block shrink-0" aria-label={name}>
        {/* The media block, with initials where a banner's date sits. */}
        <div className={cn('relative flex h-40 w-full items-end p-4', toneClass(toneFor(handle)))}>
          <UserCircle
            aria-hidden="true"
            size={28}
            weight="duotone"
            className="absolute right-4 top-4 opacity-50"
          />
          <p className="text-[44px] font-semibold leading-none tracking-[-0.03em]">{initials}</p>
        </div>

        {/* Same chip, same corner, same job as the event card's relevance
            band: the one number that ranks this card. */}
        <span className="pointer-events-none absolute left-3 top-3 inline-flex h-6 items-center gap-1 rounded-full bg-surface/95 px-2.5 text-[12px] font-medium text-ink backdrop-blur-sm">
          Guild Score
          <span className="tabular-nums text-ink-3">{score}</span>
        </span>

        {backed > 0 ? (
          <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-7 items-center gap-1 rounded-full bg-surface/95 px-3 text-[12.5px] font-medium text-ink backdrop-blur-sm">
            <SealCheck aria-hidden="true" weight="fill" className="size-3.5 text-accent" />
            {backed} backed
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {/* h2, not h3: the page's only other heading is the h1 in PageHeader,
            and h1 -> h3 is a broken outline. */}
        <h2 className="line-clamp-2 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={href} className="underline-offset-2 hover:underline">
            {name}
          </Link>
        </h2>

        <p className="mt-1.5 truncate text-[13.5px] text-ink-2">{meta}</p>

        {lookingFor ? (
          <p className="mt-2.5">
            <Pill tone="accent-soft" size="sm">
              Looking for {lookingFor.toLowerCase()}
            </Pill>
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {shown.length === 0 ? (
            <Pill tone="outline" size="sm">
              No skills listed
            </Pill>
          ) : (
            shown.map((s) =>
              s.proof_url ? (
                // The mint tint and the seal both say "backed"; the word says
                // it too, so colour is never the only signal.
                <Pill key={s.skill} tone="mint" size="sm">
                  <SealCheck aria-hidden="true" weight="fill" />
                  <span className="sr-only">Backed by a link: </span>
                  {s.skill}
                </Pill>
              ) : (
                <Pill key={s.skill} tone="neutral" size="sm">
                  {s.skill}
                </Pill>
              ),
            )
          )}
          {rest > 0 ? (
            <Pill tone="outline" size="sm">
              +{rest}
              <span className="sr-only"> more skills</span>
            </Pill>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          {availability ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
              <Clock aria-hidden="true" size={15} weight="bold" className="shrink-0 text-ink-3" />
              <span className="truncate">{availability}</span>
            </p>
          ) : (
            <span className="text-[13px] text-ink-3">No hours set</span>
          )}
          {/* Forty of these on one page, so the name goes in the accessible
              name -- "View" alone is WCAG 2.4.4. */}
          <Link
            href={href}
            aria-label={`View ${name}'s profile`}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink/85"
          >
            View
            <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </article>
  )
}
