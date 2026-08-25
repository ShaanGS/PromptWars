'use client'

import { useState } from 'react'
import { Check, ShareNetwork } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

/**
 * Share the public page for one event.
 *
 * On a phone the native sheet (WhatsApp, Messages, ...) is what people reach
 * for, so navigator.share first; on desktop, copy the link and say so for
 * two seconds. "Phone" is decided by pointer type, not by whether
 * navigator.share exists: desktop Chrome on Windows has it too and opens the
 * OS share sheet, which is not what someone at a laptop wants from a Share
 * button -- they want the link on the clipboard. The URL is built from the
 * page's own origin so it is right on localhost, a preview and production
 * alike.
 */
export function ShareButton({ eventId, title }: { eventId: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/e/${eventId}`
    const touch = window.matchMedia('(pointer: coarse)').matches
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // Cancelled, or the sheet is unavailable -- fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the prompt is the last resort, and it works.
      window.prompt('Copy this link', url)
    }
  }

  return (
    <Button variant="secondary" size="md" onClick={share} className="w-full" aria-live="polite">
      {copied ? <Check weight="bold" /> : <ShareNetwork weight="bold" />}
      {copied ? 'Link copied' : 'Share'}
    </Button>
  )
}
