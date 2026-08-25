import Link from "next/link";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Squads" },
  { href: "/people", label: "People" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            Guild
            <span className="ml-2 text-xs font-normal text-muted-foreground">@ SRM</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button asChild size="sm" className="press-feedback">
          <Link href="/demo">Explore demo</Link>
        </Button>
      </div>
      {/* Below sm the links move to their own row — a hamburger would hide three
          links behind a tap, and these are the whole app. */}
      <nav className="flex items-center gap-5 border-t border-border px-4 py-2.5 text-sm text-muted-foreground sm:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Initials({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-medium text-ink-muted ${className}`}
    >
      {initials}
    </span>
  );
}
