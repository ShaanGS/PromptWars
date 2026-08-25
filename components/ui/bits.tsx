import * as React from 'react'
import { cn } from '@/lib/utils'
import { type PillTone } from './pill'

/**
 * Small shared pieces: avatar, stat tile, data row, empty state, skeleton.
 * Each is a few lines; grouping them keeps the import list short.
 */

const TONE_BG: Record<string, string> = {
  sky: 'bg-sky text-sky-ink',
  mint: 'bg-mint text-mint-ink',
  lemon: 'bg-lemon text-lemon-ink',
  rose: 'bg-rose text-rose-ink',
  lilac: 'bg-lilac text-lilac-ink',
  peach: 'bg-peach text-peach-ink',
  accent: 'bg-accent text-white',
  'accent-soft': 'bg-accent-soft text-accent-ink',
  neutral: 'bg-surface-2 text-ink-2',
  ink: 'bg-ink text-white',
}

export function toneClass(tone: PillTone | 'neutral' = 'neutral'): string {
  return TONE_BG[tone] ?? TONE_BG.neutral
}

/** Initials avatar. Tone is derived from the name so it is stable. */
export function Avatar({
  name,
  size = 36,
  tone,
  src,
  className,
}: {
  name: string
  size?: number
  tone?: PillTone
  src?: string | null
  className?: string
}) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
  const fallback = (['sky', 'mint', 'lemon', 'rose', 'lilac', 'peach'] as const)[name.length % 6]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        toneClass(tone ?? fallback),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || '?'
      )}
    </span>
  )
}

/** Stat tile: big number, small label, pastel tint. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: PillTone | 'neutral'
  className?: string
}) {
  return (
    <div className={cn('rounded-card px-4 py-3.5', toneClass(tone), className)}>
      <p className="text-[13px] font-medium opacity-80">{label}</p>
      <p className="mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      {hint ? <p className="mt-1.5 text-[12.5px] opacity-70">{hint}</p> : null}
    </div>
  )
}

/** Boxed metadata row: icon + label in a tinted block. The approved pattern. */
export function DataRow({
  icon,
  label,
  value,
  tone = 'neutral',
  className,
}: {
  icon: React.ReactNode
  label: string
  value?: React.ReactNode
  tone?: PillTone | 'neutral'
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center gap-3 rounded-ctl px-3.5 py-3', toneClass(tone), className)}
    >
      <span className="[&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] opacity-70">{label}</p>
        {value ? <p className="break-words text-[14.5px] font-medium">{value}</p> : null}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-surface-2 text-ink-2 [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-ink-2">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-ctl bg-surface-2', className)} {...props} />
}

/** Divider with optional centred label. */
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn('border-line', className)} />
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <hr className="flex-1 border-line" />
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <hr className="flex-1 border-line" />
    </div>
  )
}
