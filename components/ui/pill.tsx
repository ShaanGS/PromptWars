import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Pill -- a small labelled capsule. Categories, states, counts.
 *
 * Pastel tones carry meaning (category, relevance band); `accent` is for
 * the one state that matters most (going); `neutral` for everything else.
 * Text is always the dark stop of the same hue.
 */
export const pillVariants = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium leading-none [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-ink-2',
        outline: 'border border-line bg-surface text-ink-2',
        accent: 'bg-accent text-white',
        'accent-soft': 'bg-accent-soft text-accent-ink',
        success: 'bg-success-soft text-success-ink',
        danger: 'bg-danger-soft text-danger-ink',
        warning: 'bg-warning-soft text-warning-ink',
        sky: 'bg-sky text-sky-ink',
        mint: 'bg-mint text-mint-ink',
        lemon: 'bg-lemon text-lemon-ink',
        rose: 'bg-rose text-rose-ink',
        lilac: 'bg-lilac text-lilac-ink',
        peach: 'bg-peach text-peach-ink',
        ink: 'bg-ink text-white',
      },
      size: {
        sm: 'h-6 px-2.5 text-[12px] [&_svg]:size-3.5',
        md: 'h-7 px-3 text-[13px] [&_svg]:size-4',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export type PillTone = NonNullable<VariantProps<typeof pillVariants>['tone']>

export function Pill({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof pillVariants>) {
  return <span className={cn(pillVariants({ tone, size }), className)} {...props} />
}

/** The six categorical pastels, in a fixed order for stable assignment. */
export const CATEGORY_TONES = [
  'sky',
  'mint',
  'lemon',
  'rose',
  'lilac',
  'peach',
] as const satisfies readonly PillTone[]

/** Deterministic tone for a string (source id, category name). */
export function toneFor(key: string): (typeof CATEGORY_TONES)[number] {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return CATEGORY_TONES[h % CATEGORY_TONES.length]
}
