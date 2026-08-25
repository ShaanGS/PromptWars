'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Segmented control -- Month / Week / Day, Feed / Saved, etc.
 *
 * Two flavours: controlled (onChange) and link-based (each option is an
 * href, active derived from `value`). Both render identically.
 */
export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; href?: string }

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange?: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}) {
  const item = cn(
    'flex flex-1 items-center justify-center whitespace-nowrap rounded-[10px] font-medium transition-colors',
    size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]',
  )
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-ctl bg-surface-2 p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        const cls = cn(item, active ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')
        return o.href ? (
          <Link
            key={o.value}
            href={o.href}
            role="tab"
            aria-selected={active}
            className={cls}
            scroll={false}
          >
            {o.label}
          </Link>
        ) : (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(o.value)}
            className={cls}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
