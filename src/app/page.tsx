import Link from "next/link";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4">
        <section className="flex flex-col items-start gap-6 pt-28 pb-24">
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
