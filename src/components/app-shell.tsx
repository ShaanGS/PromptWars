"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Plus,
  UserRoundPlus,
  UsersRound,
  Users,
} from "lucide-react";
import { GuildMark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const MAIN = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/projects", label: "Squads", icon: Users },
  { href: "/people", label: "People", icon: UsersRound },
];

const SETUP = [{ href: "/onboarding", label: "Your profile", icon: UserRoundPlus }];

function isActive(pathname: string, href: string): boolean {
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
}

/**
 * Desktop sidebar on the canvas, separated by a hairline; phones get a tab
 * bar. The active item is solid ink rather than a tint — it is the only
 * heavy element in the chrome, so there is never a question where you are.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="px-5 pt-7 pb-5">
          <Link href="/" className="inline-flex">
            <Wordmark />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <Group items={MAIN} pathname={pathname} />
          <Group title="Setup" items={SETUP} pathname={pathname} />
        </nav>

        <div className="border-t border-border p-3">
          <Button
            asChild
            className="press h-11 w-full justify-start gap-2 rounded-xl font-medium"
          >
            <Link href="/projects/new">
              <Plus className="size-4" strokeWidth={2.4} />
              New squad
            </Link>
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <Link href="/">
          <Wordmark />
        </Link>
        <Button
          asChild
          size="sm"
          className="press h-9 rounded-xl px-3 font-medium"
        >
          <Link href="/projects/new">
            <Plus className="size-4" strokeWidth={2.4} />
            New
          </Link>
        </Button>
      </header>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
          {[...MAIN, ...SETUP].map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-ink-subtle"
                }`}
              >
                <Icon className="size-[19px]" strokeWidth={active ? 2.4 : 1.9} />
                <span className="truncate">{label === "Your profile" ? "Profile" : label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Group({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: typeof MAIN;
  pathname: string;
}) {
  return (
    <div className="mb-6">
      {title && (
        <p className="mb-2 px-3 text-[11.5px] font-medium tracking-[0.08em] text-ink-subtle uppercase">
          {title}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-ink-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.9} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Standard page padding: gutters, room for the tab bar on phones. */
export function Page({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-9 ${className}`}>
      {children}
    </main>
  );
}

/** The first 80px of every screen look the same. */
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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-[34px]">
          {title}
        </h1>
        {sub && <p className="mt-2 max-w-xl text-[15px] text-ink-muted">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

export { GuildMark };
