'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOut } from '@phosphor-icons/react'
import { Wordmark } from '@/components/brand-mark'
import { Avatar } from '@/components/ui/bits'
import { cn } from '@/lib/utils'
import { NAV_ADMIN, NAV_PRIMARY, NAV_SETUP, isActive, type NavItem } from './nav'

/**
 * Desktop sidebar. Light, on the canvas, separated by a hairline -- the
 * three-column references all read as one surface, and that is what makes
 * a feed of white cards look composed rather than floating.
 */
export function Sidebar({ email, admin }: { email: string; admin: boolean }) {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
      {/* px-6 lines the wordmark up with the nav icons (px-3 group + px-3
          item). No tagline here: chrome states the name once; the tagline
          lives on login and the link preview, where it is met, not re-read
          on every visit. */}
      <div className="px-6 pb-4 pt-7">
        <Link href="/" className="inline-flex">
          <Wordmark size="lg" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Group items={NAV_PRIMARY} pathname={pathname} />
        <Group title="Setup" items={NAV_SETUP} pathname={pathname} />
        {admin ? <Group title="Admin" items={NAV_ADMIN} pathname={pathname} /> : null}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-ctl px-2 py-2">
          <Avatar name={email} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-ink" title={email}>
              {email}
            </p>
            <form method="post" action="/auth/signout">
              <button
                type="submit"
                className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
              >
                <SignOut size={13} weight="bold" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Group({ title, items, pathname }: { title?: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="mb-6">
      {title ? (
        <p className="mb-2 px-3 text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {title}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item)
          const cls = cn(
            'flex h-11 items-center gap-3 rounded-ctl px-3 text-[14.5px] font-medium transition-colors',
            active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2/70 hover:text-ink',
            item.soon && 'cursor-default hover:bg-transparent hover:text-ink-2',
          )
          const inner = (
            <>
              <item.icon size={20} weight={active ? 'fill' : 'regular'} />
              {item.label}
              {item.soon ? (
                <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">
                  soon
                </span>
              ) : null}
            </>
          )
          return (
            <li key={item.href}>
              {item.soon ? (
                <span className={cls}>{inner}</span>
              ) : (
                <Link href={item.href} className={cls} aria-current={active ? 'page' : undefined}>
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
