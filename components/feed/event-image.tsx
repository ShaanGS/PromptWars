'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Event banner that never crops badly.
 *
 * Every card frame is 16:9. Sources send banners in every shape -- 1.91:1
 * from AllEvents, square and portrait from Luma -- and `object-cover` was
 * slicing titles and faces off. Now: if the image is near 16:9 it fills the
 * frame; if it is not, the whole image is shown (`object-contain`) on top of
 * a blurred, dimmed copy of itself, so the frame stays full and nothing is
 * cut. The decision is made from the image's natural size once it loads.
 *
 * A URL that 404s keeps its empty frame rather than unmounting. Returning
 * null collapsed the card's media box and dropped the date and band chips --
 * which are positioned against it -- onto the title.
 *
 * The measurement runs from a ref callback as well as onLoad. A cached image
 * is already `complete` before React attaches its handlers, so onLoad never
 * fires on a revisit and every square logo rendered blown up and cropped --
 * the default is `cover` and nothing was left to correct it.
 */
export function EventImage({ src, alt = '' }: { src: string; alt?: string }) {
  const [fit, setFit] = useState<'cover' | 'contain'>('cover')
  const [failed, setFailed] = useState(false)

  const measure = useCallback((img: HTMLImageElement | null) => {
    if (!img?.naturalWidth || !img.naturalHeight) return
    const ratio = img.naturalWidth / img.naturalHeight
    // 16:9 is 1.78. Anything squarer than ~1.45 or wider than ~2.2 would lose
    // too much to a crop.
    setFit(ratio < 1.45 || ratio > 2.2 ? 'contain' : 'cover')
  }, [])

  if (failed) return <div className="aspect-[16/9] w-full shrink-0 bg-surface-2" />

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
      {fit === 'contain' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-xl saturate-[1.2]"
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        ref={measure}
        onLoad={(e) => measure(e.currentTarget)}
        onError={() => setFailed(true)}
        className={cn(
          'relative size-full transition-transform duration-300 group-hover:scale-[1.02]',
          fit === 'cover' ? 'object-cover' : 'object-contain',
        )}
      />
    </div>
  )
}
