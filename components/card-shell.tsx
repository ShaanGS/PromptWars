'use client'

import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The swipe-away for "Not for me", feed only.
 *
 * The server already removes a skipped card from the feed on revalidation;
 * without this the card just pops out of existence half a second after the
 * tap. Animating the exit is honesty, not decoration: the motion happens at
 * the moment of the decision, and covers the round trip.
 *
 * Two phases, deliberately not one: sliding, tilting and collapsing height
 * simultaneously read as a stutter (Shaan's verdict on v1, 2026-08-24).
 * First the card flies off right and fades -- accelerating, the way a
 * dismissal gesture should -- then, once the transform finishes, the gap
 * closes as its own motion.
 *
 * Feed only because every other surface (/events, Saved) keeps skipped rows,
 * so a card swiped out there would reappear on revalidation -- a flicker
 * worse than no animation. Those surfaces keep the plain toggle.
 */

const DismissContext = createContext<{ dismiss: () => void }>({ dismiss: () => {} })

export function useCardDismiss() {
  return useContext(DismissContext)
}

type Phase = 'idle' | 'out' | 'collapse'

export function CardShell({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle')
  return (
    <DismissContext.Provider value={{ dismiss: () => setPhase('out') }}>
      <div
        className={cn(
          // overflow-hidden does two jobs: the flying card is clipped at its
          // own frame instead of crossing its neighbour (and the viewport,
          // which would flash a horizontal scrollbar on a phone), and the
          // row collapse actually hides content rather than squashing it.
          'grid grid-rows-[1fr] overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
          phase === 'collapse' && 'grid-rows-[0fr]',
        )}
        aria-hidden={phase !== 'idle' || undefined}
      >
        <div
          className={cn(
            // `translate`, not `transform`: Tailwind v4's translate-x-* sets
            // the modern CSS `translate` property, which transition-transform
            // does NOT cover -- v1 of this shipped that way and the card
            // snapped sideways instead of sliding (found by transitionend
            // logging on live, 2026-08-24).
            'min-h-0 transition-[translate,opacity] duration-[280ms] ease-[cubic-bezier(0.55,0,1,0.45)] motion-reduce:transition-none',
            phase !== 'idle' && 'translate-x-[110%] opacity-0',
          )}
          onTransitionEnd={(e) => {
            // Own translate only: transitionend bubbles from every hover
            // transition inside the card.
            if (e.target === e.currentTarget && e.propertyName === 'translate' && phase === 'out') {
              setPhase('collapse')
            }
          }}
        >
          {children}
        </div>
      </div>
    </DismissContext.Provider>
  )
}
