"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Plus, UserRound, Users } from "lucide-react";
import { GuildMark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/projects", label: "Squads", icon: Users },
  { href: "/people", label: "People", icon: UserRound },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
}

/**
 * Two navigations, one source of truth. Desktop gets a persistent rail so the
 * sections stay one click apart; mobile gets a thumb-height tab bar, because a
 * hamburger would hide the entire app behind a tap.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link href="/" className="px-2">
          <Wordmark />
        </Link>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors duration-150 ${
                  active
                    ? "bg-primary-soft font-semibold text-accent-foreground"
                    : "font-medium text-ink-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <Button asChild className="press h-11 rounded-full font-semibold">
            <Link href="/projects/new">
              <Plus className="size-4" strokeWidth={2.6} />
              New squad
            </Link>
          </Button>
          <Link
            href="/onboarding"
            className="rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-ink-muted transition-colors hover:bg-surface-3"
          >
            <span className="font-semibold text-foreground">Not in the pool yet?</span>
            <br />
            Add your skills so squads can find you.
          </Link>
        </div>
      </aside>

      {/* Mobile top bar: identity and the one action worth a thumb up here. */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
        <Link href="/">
          <Wordmark />
        </Link>
        <Button asChild size="sm" variant="secondary" className="press rounded-full border border-border font-semibold">
          <Link href="/onboarding">Join</Link>
        </Button>
      </header>

      <div className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition-colors duration-150"
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
                    active ? "bg-primary-soft text-accent-foreground" : "text-ink-subtle"
                  }`}
                >
                  <Icon className="size-[19px]" strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className={active ? "text-accent-foreground" : "text-ink-subtle"}>
                  {label}
                </span>
              </Link>
            );
          })}
          <Link
            href="/projects/new"
            className="flex min-w-14 flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium"
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="size-[19px]" strokeWidth={2.6} />
            </span>
            <span className="text-ink-subtle">New</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

/** Standard page frame: consistent gutters and rhythm on every screen. */
export function Page({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10 ${className}`}>
      {children}
    </main>
  );
}

export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 lg:mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 max-w-xl text-sm text-ink-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export { GuildMark };
