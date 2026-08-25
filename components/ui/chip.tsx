import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Chips: filter pills in a row. Pure (no client boundary) so server pages
 * can use `chipClass` on a <Link>.
 */
/** Chip row for filters: scrolls horizontally on phones. */
export function ChipRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Chip classes, exported so a <Link> can be a chip too. */
export function chipClass(active?: boolean, className?: string): string {
  return cn(
    'inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium transition-colors [&_svg]:size-4',
    active
      ? 'border-ink bg-ink text-white'
      : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
    className,
  )
}

export function Chip({
  active,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button type="button" aria-pressed={active} className={chipClass(active, className)} {...props}>
      {children}
    </button>
  )
}
