'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { BookmarkSimple, Check, X } from '@phosphor-icons/react'
import { setEventState, type EventState } from '@/app/(app)/actions'
import { useCardDismiss } from '@/components/card-shell'
import { cn } from '@/lib/utils'

/**
 * Save / Going / Not for me.
 *
 * Optimistic so the card responds on tap rather than after a round trip --
 * mid-scroll on a phone, a half-second of nothing reads as a broken button.
 * Going is the one that gets the accent: it is the state the calendar
 * is built on.
 *
 * The two decisions that end a card's triage get physical feedback (Shaan's
 * ask, 2026-08-24): Going pops and throws a small burst; Not for me hands the
 * card to CardShell to swipe away where a shell exists (the feed). Both are
 * keyframes in globals.css behind prefers-reduced-motion.
 */

/**
 * Burst geometry per bit: angle, travel, start delay and size. The variety is
 * the point -- six identical dots leaving at once read as a mechanism, six
 * slightly different ones read as a burst.
 */
const BITS = [
  { spin: '-80deg', dist: '32px', delay: '0ms', size: 'size-1.5', cls: 'bg-accent' },
  { spin: '-40deg', dist: '40px', delay: '40ms', size: 'size-2', cls: 'bg-mint-ink' },
  { spin: '-8deg', dist: '30px', delay: '90ms', size: 'size-1', cls: 'bg-peach-ink' },
  { spin: '24deg', dist: '36px', delay: '20ms', size: 'size-1.5', cls: 'bg-sky-ink' },
  { spin: '-118deg', dist: '38px', delay: '60ms', size: 'size-1', cls: 'bg-rose-ink' },
  { spin: '-150deg', dist: '30px', delay: '110ms', size: 'size-2', cls: 'bg-lilac-ink' },
]

export function CardActions({ eventId, state }: { eventId: string; state: EventState | null }) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(state)
  const [celebrating, setCelebrating] = useState(0)
  const { dismiss } = useCardDismiss()

  function choose(next: EventState) {
    const value = optimistic === next ? null : next
    if (value === 'registered') setCelebrating(Date.now())
    if (value === 'skipped') dismiss()
    startTransition(async () => {
      setOptimistic(value)
      await setEventState(eventId, value)
    })
  }

  const going = optimistic === 'registered' || optimistic === 'going'

  return (
    <div className={cn('flex items-center gap-1.5', pending && 'opacity-70')}>
      <span className="relative inline-flex">
        {/* Remounted per celebration so a second Going replays the pop. */}
        <Btn
          key={celebrating}
          active={going}
          onClick={() => choose('registered')}
          label={going ? 'Going' : 'Going?'}
          activeClass="bg-accent text-white"
          className={celebrating ? 'going-pop' : undefined}
          wide
        >
          <Check size={15} weight="bold" />
          <span>{going ? 'Going' : 'Going?'}</span>
        </Btn>
        {celebrating ? (
          <span key={celebrating} aria-hidden className="pointer-events-none absolute inset-0">
            {BITS.map((bit) => (
              <span
                key={bit.spin}
                className={cn(
                  'confetti-bit absolute left-1/2 top-1/2 rounded-full',
                  bit.size,
                  bit.cls,
                )}
                style={
                  {
                    '--spin': bit.spin,
                    '--dist': bit.dist,
                    animationDelay: bit.delay,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
      </span>
      <Btn
        active={optimistic === 'interested'}
        onClick={() => choose('interested')}
        label="Save"
        activeClass="bg-accent-soft text-accent-ink"
      >
        <BookmarkSimple size={16} weight={optimistic === 'interested' ? 'fill' : 'bold'} />
      </Btn>
      <Btn
        active={optimistic === 'skipped'}
        onClick={() => choose('skipped')}
        label="Not for me"
        activeClass="bg-ink text-white"
      >
        <X size={15} weight="bold" />
      </Btn>
    </div>
  )
}

function Btn({
  active,
  onClick,
  label,
  activeClass,
  wide,
  className,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  activeClass: string
  wide?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors',
        wide ? 'px-3.5' : 'w-9',
        active ? activeClass : 'bg-surface-2 text-ink-2 hover:bg-line hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
