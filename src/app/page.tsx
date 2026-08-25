import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4">
        <section className="flex flex-col items-start gap-6 pt-24 pb-20">
          <p className="text-[13px] font-medium tracking-[0.4px] text-muted-foreground uppercase">
            Team formation for SRM
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.03em] text-balance sm:text-7xl">
            The best team isn&apos;t the best people.
          </h1>
          <p className="max-w-xl text-lg text-ink-muted">
            Guild scores whole teams against what a project actually needs. A second
            React dev moves your coverage from 80% to 90%. The designer you&apos;re
            missing moves it from zero.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg" className="press-feedback">
              <Link href="/demo">Explore the demo</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="press-feedback">
              <Link href="/events">Browse hackathons</Link>
            </Button>
          </div>
          <p className="text-xs text-ink-tertiary">
            No signup. You land in a live squad with three open slots.
          </p>
        </section>

        {/* Product panel — a static render of the sandbox, per the design system's
            "product UI screenshots are the protagonist" rule. */}
        <section className="pb-24">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm font-medium">CropGuard — AgriTech squad</span>
              <span className="font-mono text-xl font-semibold tabular-nums">62%</span>
            </div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full w-[62%] rounded-full bg-primary" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="text-sm font-medium">ML Engineer</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  Aarav · 70%
                </div>
              </div>
              <div className="gap-pulse rounded-xl border-2 border-dashed p-4">
                <div className="text-[10px] font-medium tracking-[0.08em] text-primary uppercase">
                  Open slot
                </div>
                <div className="mt-0.5 text-sm font-medium">Frontend</div>
              </div>
              <div className="gap-pulse rounded-xl border-2 border-dashed p-4">
                <div className="text-[10px] font-medium tracking-[0.08em] text-primary uppercase">
                  Open slot
                </div>
                <div className="mt-0.5 text-sm font-medium">Pitch &amp; Demo</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-primary/40 px-2.5 py-1 font-mono text-primary">
                Rohan +10.1% — fills Frontend
              </span>
              <span className="rounded-full border border-border px-2.5 py-1 font-mono text-muted-foreground">
                Vikram +1.5% — duplicates Frontend
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-mono text-sm text-primary">1 − Π(1 − p)</p>
            <h3 className="mt-3 text-lg font-medium tracking-tight">
              Duplicates decay, gaps don&apos;t
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Coverage is a probabilistic OR. Diminishing returns isn&apos;t a rule we
              added — it falls out of the math.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-mono text-sm text-primary">score(T ∪ c) − score(T)</p>
            <h3 className="mt-3 text-lg font-medium tracking-tight">
              Ranked by marginal gain
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Candidates are scored against your exact roster — the same person ranks
              differently on every team.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-mono text-sm text-primary">bus_factor = 1</p>
            <h3 className="mt-3 text-lg font-medium tracking-tight">Team X-ray</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Who is a single point of failure, when nobody can meet, and whose
              commitment doesn&apos;t match.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Stop building teams out of your group chat.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Real hackathons from Devfolio, Devpost, and Unstop are already listed.
              Pick one, open a squad, and let the engine find who you&apos;re missing.
            </p>
            <Button asChild size="lg" className="press-feedback mt-6">
              <Link href="/demo">Explore the demo</Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 text-xs text-muted-foreground">
          <span>Guild — built at FAST hackathon</span>
          <span className="font-mono">coverage = 1 − Π(1 − p)</span>
        </div>
      </footer>
    </>
  );
}
