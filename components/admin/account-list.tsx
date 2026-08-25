'use client'

import { useActionState, useState } from 'react'
import { ArrowCounterClockwise, Key, Prohibit } from '@phosphor-icons/react'
import {
  resetAccountPassword,
  restoreAccount,
  revokeAccount,
  type ActionResult,
} from '@/app/(app)/admin/actions'
import type { AccountRow } from '@/lib/admin/users'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Avatar, EmptyState } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { PasswordReveal, ResultNote } from './bits'

export function AccountList({ accounts, selfId }: { accounts: AccountRow[]; selfId: string }) {
  if (!accounts.length) {
    return <EmptyState title="Nobody yet" body="Add someone from the form and they appear here." />
  }
  return (
    <ul className="grid gap-2.5">
      {accounts.map((a) => (
        <AccountItem key={a.id} account={a} isSelf={a.id === selfId} />
      ))}
    </ul>
  )
}

function AccountItem({ account, isSelf }: { account: AccountRow; isSelf: boolean }) {
  const [open, setOpen] = useState<'reset' | 'revoke' | null>(null)
  const canAct = !isSelf && account.role !== 'admin'

  return (
    <li>
      <Card className={cn(account.revoked && 'opacity-70')}>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar
            name={account.email}
            size={40}
            tone={account.role === 'admin' ? 'lilac' : account.revoked ? 'rose' : undefined}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate text-[15px] font-medium text-ink">{account.email}</p>
              {isSelf ? <Pill size="sm">you</Pill> : null}
              {account.role === 'admin' ? (
                <Pill tone="lilac" size="sm">
                  admin
                </Pill>
              ) : null}
              {account.revoked ? (
                <Pill tone="danger" size="sm">
                  revoked
                </Pill>
              ) : null}
              {!account.revoked && account.mustChangePassword ? (
                <Pill tone="warning" size="sm">
                  temp password
                </Pill>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {account.lastSignInLabel} · added {account.createdLabel}
            </p>
          </div>

          {canAct ? (
            <div className="flex w-full gap-1.5 sm:w-auto">
              {!account.revoked ? (
                <>
                  <Button
                    size="sm"
                    variant={open === 'reset' ? 'primary' : 'secondary'}
                    className="flex-1 sm:flex-none"
                    onClick={() => setOpen(open === 'reset' ? null : 'reset')}
                  >
                    <Key weight="bold" />
                    Reset password
                  </Button>
                  <Button
                    size="sm"
                    variant={open === 'revoke' ? 'danger-solid' : 'danger'}
                    className="flex-1 sm:flex-none"
                    onClick={() => setOpen(open === 'revoke' ? null : 'revoke')}
                  >
                    <Prohibit weight="bold" />
                    Revoke
                  </Button>
                </>
              ) : (
                <RestoreForm account={account} />
              )}
            </div>
          ) : null}
        </div>

        {open === 'reset' && !account.revoked ? (
          <ResetForm account={account} onDone={() => setOpen(null)} />
        ) : null}
        {open === 'revoke' && !account.revoked ? (
          <RevokeForm account={account} onCancel={() => setOpen(null)} />
        ) : null}
      </Card>
    </li>
  )
}

function ResetForm({ account, onDone }: { account: AccountRow; onDone: () => void }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    resetAccountPassword,
    null,
  )
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-ctl bg-surface-2 p-3.5">
      <input type="hidden" name="userId" value={account.id} />
      <input type="hidden" name="email" value={account.email} />
      {!result?.ok ? (
        <>
          <p className="text-[13.5px] text-ink-2">
            Sets a new password for <span className="font-medium text-ink">{account.email}</span>.
            They will be asked to choose their own next time they sign in.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="password"
              type="text"
              minLength={8}
              autoComplete="off"
              placeholder="Leave blank to generate one"
              className="sm:h-9 sm:text-[13.5px]"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={pending}
                className="flex-1 sm:flex-none"
              >
                {pending ? 'Resetting…' : 'Reset'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onDone}>
                Cancel
              </Button>
            </div>
          </div>
        </>
      ) : null}
      {result ? <ResultNote result={result} /> : null}
      {result?.ok && result.password ? (
        <PasswordReveal email={account.email} password={result.password} />
      ) : null}
    </form>
  )
}

function RevokeForm({ account, onCancel }: { account: AccountRow; onCancel: () => void }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    revokeAccount,
    null,
  )
  return (
    <form
      action={action}
      className="mt-4 grid gap-3 rounded-ctl bg-danger-soft p-3.5 text-danger-ink"
    >
      <input type="hidden" name="userId" value={account.id} />
      <input type="hidden" name="email" value={account.email} />
      <p className="text-[13.5px]">
        Revoke <span className="font-medium">{account.email}</span>? They are signed out immediately
        and cannot sign in until you restore them. Their saved events are kept.
      </p>
      <div className="flex gap-2">
        <Button type="submit" variant="danger-solid" size="sm" disabled={pending}>
          {pending ? 'Revoking…' : 'Yes, revoke'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-danger-ink hover:bg-danger-ink/10 hover:text-danger-ink"
        >
          Cancel
        </Button>
      </div>
      {result && !result.ok ? <ResultNote result={result} /> : null}
    </form>
  )
}

function RestoreForm({ account }: { account: AccountRow }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    restoreAccount,
    null,
  )
  return (
    <form action={action} className="flex w-full flex-col gap-2 sm:w-auto">
      <input type="hidden" name="userId" value={account.id} />
      <input type="hidden" name="email" value={account.email} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        <ArrowCounterClockwise weight="bold" />
        {pending ? 'Restoring…' : 'Restore access'}
      </Button>
      {result && !result.ok ? <ResultNote result={result} /> : null}
    </form>
  )
}
