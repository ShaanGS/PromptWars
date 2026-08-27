import Link from 'next/link'
import { SealCheck } from '@phosphor-icons/react/dist/ssr'
import { Avatar, toneClass } from '@/components/ui/bits'
import { Pill, toneFor } from '@/components/ui/pill'
import { summariseAvailability } from '@/lib/team/availability-summary'
import { toWindows } from '@/lib/team/mappers'
import { cn } from '@/lib/utils'

/** Skills past this many fold into a "+N" pill so cards stay one height. */
const SKILLS_SHOWN = 4

export type PersonCardSkill = { skill: string; proof_url: string | null }

/**
 * A person, as the directory shows them.
 *
 * The layout owes its shape to the profile cards people already know -- a
 * colour band, the avatar sitting across it, then a row of counts -- because
 * that shape is read without instructions. What it refuses to borrow is the
 * numbers. Followers and posts would be invented here, and the three counts
 * that are NOT invented happen to be the three the ranking runs on: the Guild
 * Score, how many skills someone claims, and how many of those they backed
 * with a link. The card and the model agree, which is the whole product.
 *
 * The band's colour is keyed on the handle, so a person wears one colour
 * everywhere and the grid never reshuffles hues when the ranking moves.
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
  /** Verified-first, strongest-first -- the order the pills are shown in. */
  claims: PersonCardSkill[]
}) {
  const meta = [dept, year ? `Year ${year}` : null].filter(Boolean).join(' · ') || `@${handle}`
  const shown = claims.slice(0, SKILLS_SHOWN)
  const rest = claims.length - shown.length
  const backed = claims.filter((c) => c.proof_url).length
  const availability = summariseAvailability(toWindows(availabilityWindows))

  return (
    <Link
      href={`/p/${handle}`}
      // Without this the link's accessible name is the whole card read out,
      // which starts on a bare number before any of the words explaining it.
      aria-label={`${name} — view profile`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-line-strong"
    >
      <div className={cn('h-14', toneClass(toneFor(handle)))} />

      <div className="flex flex-1 flex-col px-4 pb-4">
        {/* Pulled up over the band, the way a profile header reads. */}
        <div className="-mt-7">
          <Avatar name={name} size={56} className="ring-4 ring-surface" />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          {/* h2, not h3: the page's only other heading is the h1 in
              PageHeader, and h1 -> h3 is a broken outline. */}
          <h2 className="truncate text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink underline-offset-2 group-hover:underline">
            {name}
          </h2>
          {backed > 0 ? (
            <SealCheck
              aria-hidden="true"
              weight="fill"
              className="size-[15px] shrink-0 text-accent"
            />
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[13.5px] text-ink-2">{meta}</p>

        <dl className="mt-3.5 grid grid-cols-3 gap-2 border-y border-line py-3">
          <Stat label="Guild Score" value={score} />
          <Stat label="Skills" value={claims.length} />
          <Stat label="Backed" value={backed} />
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

        {lookingFor || availability ? (
          <p className="mt-auto truncate pt-3 text-[12.5px] text-ink-3">
            {[lookingFor ? `Looking for ${lookingFor.toLowerCase()}` : null, availability]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10.5px] font-medium uppercase tracking-[0.07em] text-ink-3">
        {label}
      </dt>
      <dd className="mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
        {value}
      </dd>
    </div>
  )
}
