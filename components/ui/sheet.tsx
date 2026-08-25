'use client'

import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/**
 * Sheet: a bottom sheet on phones, a centred dialog from `sm` up.
 *
 * One component for both because the content is the same; only the
 * placement changes with the viewport. Built on base-ui Dialog for focus
 * trapping, escape, and scroll lock.
 */
export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close

export function SheetContent({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <Dialog.Popup
        className={cn(
          'fixed z-50 bg-surface shadow-float outline-none transition-all duration-200',
          // phone: bottom sheet
          'inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-panel data-[ending-style]:translate-y-4 data-[starting-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
          // desktop: centred
          'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel sm:data-[ending-style]:translate-y-[calc(-50%+8px)] sm:data-[starting-style]:translate-y-[calc(-50%+8px)]',
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-start gap-3 px-5 pb-2 pt-4">
          <div className="min-w-0 flex-1">
            <Dialog.Title className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-0.5 text-[14px] text-ink-2">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Dialog.Close
            aria-label="Close"
            className="-mr-1.5 -mt-1 flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} weight="bold" />
          </Dialog.Close>
        </div>
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
          {children}
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  )
}
