'use client'

import { useState } from 'react'
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
 */
export function EventImage({ src, alt = '' }: { src: string; alt?: string }) {
  const [fit, setFit] = useState<'cover' | 'contain'>('cover')
  const [failed, setFailed] = useState(false)

  if (failed) return null

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
        onLoad={(e) => {
          const img = e.currentTarget
          if (!img.naturalWidth || !img.naturalHeight) return
          const ratio = img.naturalWidth / img.naturalHeight
          // 16:9 is 1.78. Anything squarer than ~1.45 or wider than ~2.2
          // would lose too much to a crop.
          if (ratio < 1.45 || ratio > 2.2) setFit('contain')
        }}
        onError={() => setFailed(true)}
        className={cn(
          'relative size-full transition-transform duration-300 group-hover:scale-[1.02]',
          fit === 'cover' ? 'object-cover' : 'object-contain',
        )}
      />
    </div>
  )
}
