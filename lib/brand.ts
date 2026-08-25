/**
 * Olvable brand constants. Agreed 2026-08-23.
 *
 * Colour lives in app/globals.css as CSS variables; this file only mirrors
 * the few values that code needs outside the stylesheet (SVG, meta tags).
 * Keep the two in sync by hand -- there are nine numbers.
 */
export const COLOUR = {
  ink: '#12131A',
  ink2: '#6B7080',
  canvas: '#F5F6FA',
  surface: '#FFFFFF',
  line: '#E2E4EC',
  accent: '#5B5BD6',
  accentInk: '#3B3BA6',
} as const

export const BRAND = {
  name: 'Guild',
  // Shaan's pick, 2026-08-24 — replaced "Everything happening. One place."
  tagline: 'Find people. Form teams. Build something.',
  scope: 'SRM',
} as const
