import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Page header: eyebrow (optional), big title, one-line subtitle, actions.
 *
 * Used at the top of every screen so the first 80px of each page look the
 * same. Title is 32 on phones, 36 from `sm`.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[13px] font-medium text-ink-2">{eyebrow}</p> : null}
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[36px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-[15px] text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** Standard page padding: gutters, room for the tab bar on phones. */
export function Page({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1200px] px-4 pb-28 pt-5 sm:px-6 lg:pb-16 lg:pt-8',
        className,
      )}
      {...props}
    />
  )
}
