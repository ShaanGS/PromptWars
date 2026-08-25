import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Form field pieces. Label above, control below, hint or error under.
 *
 * The input is 44px on phones (thumb-sized) and 40px from `sm` up.
 */
export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label className={cn('block text-[13.5px] font-medium text-ink-2', className)} {...props} />
  )
}

export const inputClass =
  'h-12 w-full min-w-0 rounded-ctl border border-line bg-surface px-4 text-[15.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50 sm:h-11 sm:text-[14.5px]'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}

/** Input with a leading icon. */
export function IconInput({
  icon,
  className,
  ...props
}: React.ComponentProps<'input'> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-3 [&_svg]:size-[18px]">
        {icon}
      </span>
      <input className={cn(inputClass, 'pl-11', className)} {...props} />
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-3">optional</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger-ink">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

/** Inline status line under a form: success or error. */
export function FormNote({ tone, children }: { tone: 'ok' | 'err'; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        'rounded-ctl px-3.5 py-2.5 text-[13.5px] font-medium',
        tone === 'ok' ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink',
      )}
    >
      {children}
    </p>
  )
}
