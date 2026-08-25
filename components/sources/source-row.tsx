'use client'

import { useOptimistic, useTransition } from 'react'
import { DateTime } from 'luxon'
import { Bell, BellSlash } from '@phosphor-icons/react'
import type { SourceInfo } from '@/lib/queries'
import { setSourceMuted } from '@/app/(app)/sources/actions'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { Button } from '@/components/ui/button'

/** The health strip's status rules, spelled out in words. */
function statusOf(s: SourceInfo): { dot: string; label: string } {
  const broken = s.last_status === 'error' || s.last_status === 'running'
  const empty = s.last_status === 'ok' && s.event_count === 0
  if (broken) {
    return {
      dot: 'bg-danger',
      label: s.last_status === 'error' ? 'Last run failed' : 'Running now',
    }
  }
  if (empty) return { dot: 'bg-danger', label: 'Runs, but finds nothing' }
  if (s.last_status === 'ok') return { dot: 'bg-success', label: 'Healthy' }
  if (s.last_status === 'partial') return { dot: 'bg-lemon-ink', label: 'Partial last run' }
  return { dot: 'bg-line-strong', label: 'No runs yet' }
}

/**
 * One live source: health, last run, upcoming count, and the Mute switch.
 * Optimistic so the row answers on tap; the server action revalidates the
 * feed, calendar and All events behind it.
 */
export function SourceRow({ source }: { source: SourceInfo }) {
  const [pending, startTransition] = useTransition()
  const [muted, setMuted] = useOptimistic(source.muted)
  const status = statusOf(source)
  const lastRun = source.lastRunAt ? DateTime.fromISO(source.lastRunAt) : null

  function toggle() {
    const next = !muted
    startTransition(async () => {
      setMuted(next)
      await setSourceMuted(source.id, next)
    })
  }

  return (
    <Card className={cn('transition-opacity', muted && 'opacity-70', pending && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'size-2.5 shrink-0 rounded-full',
            muted ? 'border border-line-strong bg-surface' : status.dot,
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[15.5px] font-medium text-ink">{source.display_name}</p>
            <Pill size="sm" tone={source.event_count ? 'sky' : 'neutral'}>
              {source.event_count} {source.kind === 'deadlines' ? 'open' : 'upcoming'}
            </Pill>
            {source.kind === 'deadlines' ? (
              <Pill size="sm" tone="lilac">
                hackathons
              </Pill>
            ) : null}
            {muted ? <Pill size="sm">muted</Pill> : null}
          </div>
          <p className="mt-0.5 text-[13.5px] text-ink-2">
            {muted ? (
              source.kind === 'deadlines' ? (
                'Hidden from Hackathons. Saved events stay.'
              ) : (
                'Hidden from your feed, calendar and All events. Saved events stay.'
              )
            ) : (
              <>
                {status.label}
                {lastRun?.isValid ? (
                  <>
                    {' · last run '}
                    <span title={lastRun.toFormat('d LLL, h:mm a')}>{lastRun.toRelative()}</span>
                  </>
                ) : null}
                {source.lastListings !== null ? ` · ${source.lastListings} listings found` : ''}
              </>
            )}
          </p>
          {!muted && source.last_status === 'error' && source.lastError ? (
            <p
              className="mt-1 truncate font-mono text-[12px] text-danger-ink"
              title={source.lastError}
            >
              {source.lastError.slice(0, 140)}
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant={muted ? 'primary' : 'secondary'}
          onClick={toggle}
          disabled={pending}
          aria-pressed={muted}
          className="w-full sm:w-auto"
        >
          {muted ? <Bell weight="bold" /> : <BellSlash weight="bold" />}
          {muted ? 'Unmute' : 'Mute'}
        </Button>
      </div>
    </Card>
  )
}
