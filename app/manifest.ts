import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/brand'

/**
 * The install manifest -- what makes "Add to Home Screen" produce a real
 * app: standalone window, no browser chrome, the mark on the home screen.
 *
 * No service worker on purpose: installability no longer requires one, and
 * an offline cache of a feed that updates daily is a way to show stale
 * events with confidence. The app stays online-only and honest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.tagline,
    start_url: '/',
    display: 'standalone',
    // Canvas grey behind the splash, so launch doesn't flash white-then-grey.
    background_color: '#f5f6fa',
    theme_color: '#f5f6fa',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
