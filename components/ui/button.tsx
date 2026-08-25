import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button.
 *
 * One `accent` button per view at most -- it is the thing the screen wants
 * you to do. `primary` (ink) is the everyday strong button. `secondary` is
 * the default: white, hairline border. `ghost` for toolbars and rows.
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        accent: 'bg-accent text-white hover:bg-accent-hover',
        primary: 'bg-ink text-white hover:bg-ink/85',
        secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger-soft text-danger-ink hover:bg-danger hover:text-white',
        'danger-solid': 'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px] [&_svg]:size-4',
        md: 'h-11 px-4.5 text-[14.5px] [&_svg]:size-[18px]',
        lg: 'h-12 px-5 text-[15.5px] [&_svg]:size-5',
        'icon-sm': 'size-9 [&_svg]:size-[18px]',
        icon: 'size-11 [&_svg]:size-5',
      },
      pill: {
        true: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, pill, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, pill }), className)}
      {...props}
    />
  )
}
