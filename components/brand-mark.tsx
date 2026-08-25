import { BRAND } from '@/lib/brand'
import { VA, WORDMARK } from '@/lib/brand-paths'
import { cn } from '@/lib/utils'

/**
 * The Olvable brand, as supplied (brand/source/): a lowercase wordmark
 * whose "va" ligature doubles as the secondary mark. Both are single
 * SVG paths traced from the artwork and filled with currentColor, so they
 * take any ink and stay crisp at any size.
 */

/** The bare "va" glyph. `height` in px; width follows the 326:127 ratio. */
export function Glyph({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VA.w} ${VA.h}`}
      height={height}
      width={Math.round((height * VA.w) / VA.h)}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={VA.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

/**
 * The mark as an app-icon tile: "va" in white on an ink rounded square.
 * `size` is the square's side. Use where a square mark is expected
 * (login, wizard, avatars); elsewhere prefer the wordmark.
 */
export function BrandMark({
  size = 40,
  tone = 'ink',
  className,
}: {
  size?: number
  tone?: 'ink' | 'accent' | 'surface'
  className?: string
}) {
  const bg =
    tone === 'ink'
      ? 'bg-ink text-white'
      : tone === 'accent'
        ? 'bg-accent text-white'
        : 'bg-surface text-ink border border-line'
  return (
    <span
      role="img"
      aria-label="Olvable"
      className={cn('inline-flex shrink-0 items-center justify-center', bg, className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.26) }}
    >
      <Glyph height={Math.round(size * 0.26)} />
    </span>
  )
}

/**
 * The wordmark. `size` sets the cap height; width follows.
 *
 * Guild's logo is supplied as one piece of artwork — the mark and the word
 * are the same drawing — so it is rendered as that file rather than retraced
 * or retyped. It is white-on-black, so on the light canvas it is inverted and
 * multiplied, which drops the black ground and leaves the artwork itself
 * untouched.
 */
export function Wordmark({
  tagline = false,
  onDark = false,
  size = 'md',
  className,
}: {
  tagline?: boolean
  onDark?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const height = { sm: 44, md: 64, lg: 112, xl: 150 }[size]
  return (
    <div
      className={cn(
        'inline-flex flex-col items-start',
        onDark ? 'text-canvas' : 'text-ink',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/guild-logo.png"
        alt={BRAND.name}
        height={height}
        style={{ height }}
        className={cn('w-auto', onDark ? 'mix-blend-screen' : '[filter:invert(1)] mix-blend-multiply')}
      />
      {tagline ? (
        <span
          className={cn(
            'mt-1.5 whitespace-nowrap text-[11.5px] leading-none',
            onDark ? 'text-canvas/70' : 'text-ink-3',
          )}
        >
          {BRAND.tagline}
        </span>
      ) : null}
    </div>
  )
}
