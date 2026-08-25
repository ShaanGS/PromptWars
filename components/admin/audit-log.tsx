import { DateTime } from 'luxon'
import type { AuditRow } from '@/lib/admin/users'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/bits'

const LABEL: Record<string, { text: string; dot: string }> = {
  create: { text: 'added', dot: 'bg-success' },
  reset_password: { text: 'reset the password of', dot: 'bg-accent' },
  revoke: { text: 'revoked', dot: 'bg-danger' },
  restore: { text: 'restored', dot: 'bg-success' },
  grant_admin: { text: 'made admin:', dot: 'bg-lilac-ink' },
  password_changed: { text: 'changed their own password', dot: 'bg-line-strong' },
}

export function AuditLog({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) {
    return <EmptyState title="Nothing yet" body="Everything you do here is recorded." />
  }
  return (
    <Card padded={false}>
      <ol>
        {rows.map((r, i) => {
          const l = LABEL[r.action] ?? { text: r.action, dot: 'bg-line-strong' }
          const self = r.action === 'password_changed'
          const dt = DateTime.fromISO(r.at)
          return (
            <li
              key={r.id}
              className={cn('flex items-start gap-3 px-4 py-3', i > 0 && 'border-t border-line')}
            >
              <span className={cn('mt-[7px] size-2 shrink-0 rounded-full', l.dot)} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug text-ink">
                  <span className="font-medium">{r.actorEmail}</span> {l.text}
                  {!self ? (
                    <>
                      {' '}
                      <span className="font-medium">{r.targetEmail}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-3" title={dt.toISO() ?? ''}>
                  {dt.toRelative()} · {dt.toFormat('d LLL, h:mm a')}
                  {r.detail ? ` · ${r.detail}` : ''}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
