import type { SourceHealth } from '@/lib/queries'
import { cn } from '@/lib/utils'

/**
 * Per-source event counts, not just run status. "Did the scraper run?" and
 * "is it finding anything?" are different questions; zero-with-history is
 * the tell.
 */
export function HealthStrip({ health }: { health: SourceHealth[] }) {
  const enabled = health.filter((s) => s.enabled)
  const pending = health.filter((s) => !s.enabled)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
      {enabled.map((s) => {
        const broken = s.last_status === 'error' || s.last_status === 'running'
        const empty = s.last_status === 'ok' && s.event_count === 0
        if (s.muted) {
          return (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-ink-3">
              <span className="size-2 rounded-full border border-line-strong" />
              <span className="font-medium">{s.display_name}</span>
              <span>muted</span>
            </span>
          )
        }
        return (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'size-2 rounded-full',
                broken || empty
                  ? 'bg-danger'
                  : s.last_status === 'ok'
                    ? 'bg-success'
                    : s.last_status === 'partial'
                      ? 'bg-lemon-ink'
                      : 'bg-line-strong',
              )}
            />
            <span className="font-medium text-ink">{s.display_name}</span>
            <span className="tabular-nums">{s.event_count}</span>
            {s.kind === 'deadlines' ? <span className="text-ink-3">hackathons</span> : null}
          </span>
        )
      })}
      {pending.length ? (
        <span className="text-ink-3">
          {pending.length} source{pending.length === 1 ? '' : 's'} not wired yet
        </span>
      ) : null}
    </div>
  )
}
