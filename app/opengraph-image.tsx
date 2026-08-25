import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { COLOUR, BRAND } from '@/lib/brand'
import { WORDMARK } from '@/lib/brand-paths'

/**
 * The link preview -- what WhatsApp, Slack and the rest render when someone
 * pastes an olvable link. Before this existed the card was bare text, which
 * on a share is the whole first impression.
 *
 * Drawn from the real traced wordmark path, tagline in Inter SemiBold (the
 * TTF lives in brand/fonts; satori cannot use next/font). One word set in
 * mint -- the single off-note that keeps it from reading as a template.
 */

export const alt = `${BRAND.name} — ${BRAND.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// fs, not fetch(import.meta.url): Turbopack does not implement asset-URL
// fetch. The path is traced into the deploy via outputFileTracingIncludes.
const font = readFile(join(process.cwd(), 'brand', 'fonts', 'Inter-SemiBold.ttf'))

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLOUR.ink,
        gap: 36,
      }}
    >
      {/* Everything fits the central 630px square: WhatsApp's compact card
          centre-crops to 1:1, and the first version lost the wordmark's
          edges to exactly that. */}
      <svg
        width={460}
        height={Math.round((460 / WORDMARK.w) * WORDMARK.h)}
        viewBox={`0 0 ${WORDMARK.w} ${WORDMARK.h}`}
      >
        <path d={WORDMARK.d} fill="#FFFFFF" fillRule="evenodd" />
      </svg>
      <div
        style={{
          display: 'flex',
          fontSize: 32,
          color: 'rgba(245, 246, 250, 0.85)',
          letterSpacing: '-0.01em',
        }}
      >
        <span>Touch&nbsp;</span>
        <span style={{ color: '#a7e3c6' }}>grass</span>
        <span>, professionally.</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: 'Inter', data: await font, weight: 600, style: 'normal' }],
    },
  )
}
