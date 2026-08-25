'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/** Underline tabs for page-level navigation (Feed · Saved, or Month · Week). */
export function NavTabs({
  items,
  className,
}: {
  items: { href: string; label: string; exact?: boolean }[]
  className?: string
}) {
  const pathname = usePathname()
  return (
    <nav className={cn('-mb-px flex gap-5 border-b border-line', className)}>
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'border-b-2 pb-3 text-[14.5px] font-medium transition-colors',
              active ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink',
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
