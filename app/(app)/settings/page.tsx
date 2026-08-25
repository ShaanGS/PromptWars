import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  ListBullets,
  Plugs,
  ShieldCheck,
  SignOut,
  Sparkle,
  Trophy,
  Warning,
} from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { getSessionUser } from '@/lib/auth/server'
import { mustChangePassword, roleOf } from '@/lib/auth/roles'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'
import { buttonVariants } from '@/components/ui/button'
import { ChangePasswordForm } from '@/components/change-password-form'

/**
 * /settings -- and, on phones, the "You" tab.
 *
 * Account card first (who you are, where to go, how to leave), then Browse,
 * then the password. The Sign out button lives here because the phone has no
 * sidebar: without it a phone user had no way out at all. Browse is there for
 * the same reason -- All events, Hackathons and Sources are sidebar-only, so
 * on a phone this card is the only route to them.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const params = await searchParams
  const first = params.first === '1' || mustChangePassword(user)
  const admin = roleOf(user) === 'admin'
  const email = user.email ?? ''

  return (
    <Page>
      <PageHeader title="Settings" subtitle={`Signed in as ${email}`} />

      <div className="mt-6 grid max-w-[560px] gap-4">
        {first ? (
          <div className="flex items-start gap-2.5 rounded-ctl bg-warning-soft px-4 py-3 text-warning-ink">
            <Warning size={18} weight="duotone" className="mt-px shrink-0" />
            <div>
              <p className="text-[14.5px] font-medium">Choose your own password to continue</p>
              <p className="mt-0.5 text-[13.5px] opacity-90">
                The one you signed in with was set for you. Pick a new one and the rest of Olvable
                unlocks.
              </p>
            </div>
          </div>
        ) : null}

        {first ? <ChangePasswordForm forced /> : null}

        <Card className={first ? 'order-last' : undefined}>
          <div className="flex items-center gap-3">
            <Avatar name={email} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold text-ink" title={email}>
                {email}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <Pill tone={admin ? 'lilac' : 'neutral'} size="sm">
                  {admin ? 'Admin' : 'Member'}
                </Pill>
              </div>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-line border-t border-line">
            <li>
              <Link
                href="/interests"
                className="flex items-center gap-3 py-3 text-[14.5px] text-ink transition-colors hover:text-accent"
              >
                <Sparkle size={18} weight="duotone" className="text-ink-2" />
                <span className="flex-1">
                  Interests
                  <span className="block text-[13px] text-ink-3">
                    What the feed ranks up for you
                  </span>
                </span>
                <ArrowRight size={16} weight="bold" className="text-ink-3" />
              </Link>
            </li>
            {admin ? (
              <li>
                <Link
                  href="/admin"
                  className="flex items-center gap-3 py-3 text-[14.5px] text-ink transition-colors hover:text-accent"
                >
                  <ShieldCheck size={18} weight="duotone" className="text-ink-2" />
                  <span className="flex-1">
                    Access
                    <span className="block text-[13px] text-ink-3">Who can sign in</span>
                  </span>
                  <ArrowRight size={16} weight="bold" className="text-ink-3" />
                </Link>
              </li>
            ) : null}
          </ul>

          <form method="post" action="/auth/signout" className="mt-4">
            <button
              type="submit"
              className={buttonVariants({
                variant: 'secondary',
                size: 'md',
                className: 'w-full sm:w-auto',
              })}
            >
              <SignOut weight="bold" />
              Sign out
            </button>
          </form>
        </Card>

        {/* The sidebar exists from lg up, so there this card is pure duplication. */}
        <Card className={cn('lg:hidden', first && 'order-last')}>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Browse</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            The rest of Olvable. On a desktop these live in the sidebar.
          </p>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {[
              {
                href: '/events',
                icon: <ListBullets size={18} weight="duotone" className="text-ink-2" />,
                label: 'All events',
                hint: 'Every listing in scope, not just the ranked feed',
              },
              {
                href: '/hackathons',
                icon: <Trophy size={18} weight="duotone" className="text-ink-2" />,
                label: 'Hackathons',
                hint: 'Hackathons and competitions, closing soonest first',
              },
              {
                href: '/sources',
                icon: <Plugs size={18} weight="duotone" className="text-ink-2" />,
                label: 'Sources',
                hint: 'Where events come from, and what to mute',
              },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 py-3 text-[14.5px] text-ink transition-colors hover:text-accent"
                >
                  {item.icon}
                  <span className="flex-1">
                    {item.label}
                    <span className="block text-[13px] text-ink-3">{item.hint}</span>
                  </span>
                  <ArrowRight size={16} weight="bold" className="text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {!first ? <ChangePasswordForm forced={false} /> : null}
      </div>
    </Page>
  )
}
