'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck } from '@phosphor-icons/react'
import { Wordmark } from '@/components/brand-mark'
import { cn } from '@/lib/utils'
import { NAV_PRIMARY, NAV_YOU, isActive } from './nav'

/**
 * Phone chrome: a slim top bar and a bottom tab bar.
 *
 * The tab bar is the primary navigation on a phone -- Feed, Calendar, Saved,
 * You -- within thumb reach. The top bar only carries the wordmark and, for
 * the admin, the door to Access. Both hide from `lg` up where the sidebar
 * takes over.
 */
export function TopBar({ admin }: { admin: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-md lg:hidden">
      <Link href="/" className="inline-flex" aria-label="Feed">
        <Wordmark size="sm" />
      </Link>
      {admin ? (
        <Link
          href="/admin"
          aria-label="Access"
          className="flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <ShieldCheck size={22} weight="duotone" />
        </Link>
      ) : null}
    </header>
  )
}

export function TabBar() {
  const pathname = usePathname()
  const items = [...NAV_PRIMARY.filter((i) => i.tab), NAV_YOU]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const active = isActive(pathname, item)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-[60px] flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-ink' : 'text-ink-3',
                )}
              >
                <item.icon size={24} weight={active ? 'fill' : 'regular'} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
