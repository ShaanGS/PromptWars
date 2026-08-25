import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Users } from "lucide-react";
import { Avatar, GuildMark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getPool, listEvents } from "@/repo/queries";

// The orbit is the product in one picture: separate people arranged around a
// shared centre. Positions are hand-placed rather than evenly spaced — an even
// ring reads as a loading spinner.
const ORBIT = [
  { top: "2%", left: "34%", size: "size-11 text-xs" },
  { top: "12%", left: "72%", size: "size-14 text-sm" },
  { top: "44%", left: "88%", size: "size-10 text-[11px]" },
  { top: "78%", left: "68%", size: "size-12 text-xs" },
  { top: "86%", left: "30%", size: "size-11 text-xs" },
  { top: "50%", left: "0%", size: "size-14 text-sm" },
  { top: "16%", left: "6%", size: "size-10 text-[11px]" },
];

export default async function Landing() {
  const [pool, events] = await Promise.all([getPool(), listEvents()]);
  const faces = pool.slice(0, ORBIT.length);
  const liveEvents = events.filter(
    (e) => !e.deadline_at || new Date(e.deadline_at).getTime() >= Date.now(),
  ).length;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            className="press hidden rounded-full border border-border font-semibold sm:inline-flex"
          >
            <Link href="/events">Browse hackathons</Link>
          </Button>
          <Button asChild className="press rounded-xl font-semibold">
            <Link href="/demo">Open the demo</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-2 lg:gap-16 lg:py-16">
          {/* Orbit first on mobile: it explains the idea before any words do. */}
          <div className="order-1 lg:order-2">
            <div className="relative mx-auto aspect-square w-full max-w-[380px] sm:max-w-[440px]">
              <div className="absolute inset-[9%] rounded-full border border-dashed border-accent/25" />
              <div className="absolute inset-[22%] rounded-full bg-primary-soft/60" />
              <div className="absolute inset-[30%] rounded-full bg-white shadow-[var(--shadow-lift)]" />
              <div className="absolute inset-[30%] flex items-center justify-center">
                <GuildMark className="size-[46%] rounded-2xl" />
              </div>

              {faces.map((p, i) => (
                <div
                  key={p.id}
                  className="rise-in absolute"
                  style={
                    {
                      top: ORBIT[i].top,
                      left: ORBIT[i].left,
                      "--rise-delay": `${120 + i * 70}ms`,
                    } as React.CSSProperties
                  }
                >
                  <Avatar
                    name={p.name}
                    className={`${ORBIT[i].size} ring-4 ring-background`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="order-2 flex flex-col items-start gap-6 lg:order-1">
            <span className="g-chip-accent">
              <Users className="size-3.5" strokeWidth={2.4} />
              Built for SRM
            </span>
            <h1 className="text-[38px] leading-[1.06] font-semibold tracking-[-0.035em] text-balance sm:text-[52px] lg:text-[58px]">
              Let&apos;s build something{" "}
              <span className="text-accent">together</span>
            </h1>
            <p className="max-w-md text-[17px] leading-relaxed text-ink-muted">
              Find people, form teams, and bring ideas to life. Guild scores the
              whole team against what your project needs — so you add the person
              you&apos;re missing, not another copy of who you already have.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="lg"
                className="press h-12 rounded-xl bg-foreground px-7 text-[15px] font-semibold hover:bg-foreground/90"
              >
                <Link href="/demo">
                  Open the demo
                  <ArrowRight className="size-4" strokeWidth={2.6} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="press h-12 rounded-xl border border-border px-7 text-[15px] font-semibold"
              >
                <Link href="/events">Browse hackathons</Link>
              </Button>
            </div>
            <p className="text-sm text-ink-subtle">
              No signup. You land in a live squad with three open slots.
            </p>
          </div>
        </section>

        {/* Proof before pitch: real counts from the seeded pool. */}
        <section className="grid grid-cols-3 gap-3 pb-4 sm:gap-4">
          {[
            { n: pool.length, label: "people in the pool", icon: Users },
            { n: liveEvents, label: "hackathons open now", icon: CalendarDays },
            { n: "1−Π(1−p)", label: "how coverage is scored", icon: BadgeCheck },
          ].map((s) => (
            <div key={s.label} className="g-card p-4 sm:p-5">
              <s.icon className="size-4 text-accent" strokeWidth={2.2} />
              <div className="g-figure mt-3 text-xl font-semibold sm:text-2xl">{s.n}</div>
              <div className="mt-0.5 text-xs leading-snug text-ink-muted sm:text-sm">
                {s.label}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 py-12 sm:grid-cols-3">
          {[
            {
              t: "Duplicates decay. Gaps don't.",
              d: "A second React dev takes coverage from 80% to 90%. The designer you don't have takes it from zero.",
            },
            {
              t: "Ranked by what you add",
              d: "Candidates are scored against your exact roster, so the same person ranks differently on every team.",
            },
            {
              t: "See the team's weak point",
              d: "Who is a single point of failure, when nobody is free at the same time, whose commitment doesn't match.",
            },
          ].map((f) => (
            <div key={f.t} className="g-card p-6">
              <h3 className="text-[17px] leading-snug font-semibold tracking-[-0.02em]">
                {f.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="pb-16">
          <div className="g-card overflow-hidden p-8 text-center sm:p-12">
            <h2 className="mx-auto max-w-lg text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-3xl">
              Stop building teams out of your group chat.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              Real hackathons from Devfolio, Devpost and Unstop are already
              listed. Pick one, open a squad, and let the engine find who
              you&apos;re missing.
            </p>
            <Button
              asChild
              size="lg"
              className="press mt-7 h-13 rounded-full px-7 text-[15px] font-semibold"
            >
              <Link href="/demo">
                Open the demo
                <ArrowRight className="size-4" strokeWidth={2.6} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs text-ink-subtle">
          <span>Guild — built at the FAST hackathon</span>
          <Link href="/events" className="font-semibold text-accent">
            Browse hackathons
          </Link>
        </div>
      </footer>
    </div>
  );
}
