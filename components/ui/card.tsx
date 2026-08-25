import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card: white, hairline border, 16px radius, near-zero shadow.
 * `padded` is the default; pass `padded={false}` for image-first cards that
 * manage their own inner spacing.
 */
export function Card({
  className,
  padded = true,
  interactive = false,
  ...props
}: React.ComponentProps<'div'> & { padded?: boolean; interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-card border border-line bg-surface shadow-card',
        padded && 'p-4 sm:p-5',
        interactive && 'transition-colors hover:border-line-strong',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink',
        className,
      )}
      {...props}
    />
  )
}

export function CardMeta({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-[13.5px] leading-snug text-ink-2', className)} {...props} />
}

/** Section heading used above groups of cards: small icon + title + optional aside. */
export function SectionHeading({
  icon,
  title,
  aside,
  className,
}: {
  icon?: React.ReactNode
  title: string
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center gap-2', className)}>
      {icon ? <span className="text-ink-2 [&_svg]:size-[18px]">{icon}</span> : null}
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {aside ? <div className="ml-auto text-[13.5px] text-ink-2">{aside}</div> : null}
    </div>
  )
}
