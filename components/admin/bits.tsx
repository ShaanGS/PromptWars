'use client'

import { useState } from 'react'
import { Check, Copy } from '@phosphor-icons/react'
import type { ActionResult } from '@/app/(app)/admin/actions'
import { FormNote } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

export function ResultNote({ result }: { result: ActionResult }) {
  return <FormNote tone={result.ok ? 'ok' : 'err'}>{result.message}</FormNote>
}

/**
 * The one place a password is ever visible. Copy puts "email / password" on
 * the clipboard together, because that is what gets pasted into a chat.
 */
export function PasswordReveal({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${email}\n${password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be unavailable (http, permissions). The text is on
      // screen; selecting it still works.
    }
  }

  return (
    <div className="rounded-ctl bg-warning-soft p-3.5 text-warning-ink">
      <p className="text-[12px] font-medium uppercase tracking-[0.06em] opacity-80">
        Shown once — copy it now
      </p>
      <p className="mt-2 truncate text-[13.5px] font-medium">{email}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all break-all rounded-[10px] bg-surface px-3 py-2 font-mono text-[14px] text-ink">
          {password}
        </code>
        <Button type="button" variant="primary" size="sm" onClick={copy}>
          {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
