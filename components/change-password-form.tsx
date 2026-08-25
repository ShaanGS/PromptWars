'use client'

import { useActionState } from 'react'
import { LockSimple } from '@phosphor-icons/react'
import { changePassword, type PasswordResult } from '@/app/(app)/settings/actions'
import { Card, CardTitle } from '@/components/ui/card'
import { Field, FormNote, IconInput } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [result, action, pending] = useActionState<PasswordResult | null, FormData>(
    changePassword,
    null,
  )

  return (
    <Card>
      <form action={action} className="grid gap-4">
        <CardTitle>Password</CardTitle>

        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <IconInput
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="New password"
            icon={<LockSimple weight="bold" />}
          />
        </Field>

        <Field label="Again, to be sure" htmlFor="confirm">
          <IconInput
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Same password"
            icon={<LockSimple weight="bold" />}
          />
        </Field>

        <Button
          type="submit"
          variant={forced ? 'accent' : 'primary'}
          size="md"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending ? 'Saving…' : forced ? 'Set password and continue' : 'Update password'}
        </Button>

        {result ? <FormNote tone={result.ok ? 'ok' : 'err'}>{result.message}</FormNote> : null}
      </form>
    </Card>
  )
}
