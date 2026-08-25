'use client'

import { useActionState, useEffect, useRef } from 'react'
import { EnvelopeSimple, LockSimple, UserPlus } from '@phosphor-icons/react'
import { createAccount, type ActionResult } from '@/app/(app)/admin/actions'
import { Card, CardMeta, CardTitle } from '@/components/ui/card'
import { Field, IconInput } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { PasswordReveal, ResultNote } from './bits'

/**
 * Create an account. Leaving the password blank generates one; either way
 * the password is shown exactly once, here, and the admin passes it on.
 */
export function CreateAccountForm() {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    createAccount,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (result?.ok) formRef.current?.reset()
  }, [result])

  return (
    <Card>
      <form ref={formRef} action={action} className="grid gap-4">
        <div>
          <CardTitle>Add someone</CardTitle>
          <CardMeta className="mt-1">
            No email is sent. You hand them the password; they pick their own on first sign-in.
          </CardMeta>
        </div>

        <Field label="Email" htmlFor="new-email">
          <IconInput
            id="new-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="friend@example.com"
            icon={<EnvelopeSimple weight="bold" />}
          />
        </Field>

        <Field label="Password" htmlFor="new-password" optional hint="Leave blank to generate one.">
          <IconInput
            id="new-password"
            name="password"
            type="text"
            minLength={8}
            autoComplete="off"
            placeholder="At least 8 characters"
            icon={<LockSimple weight="bold" />}
          />
        </Field>

        <Button type="submit" variant="primary" size="md" disabled={pending} className="w-full">
          <UserPlus weight="bold" />
          {pending ? 'Creating…' : 'Create account'}
        </Button>

        {result ? <ResultNote result={result} /> : null}
        {result?.ok && result.password ? (
          <PasswordReveal email={result.email ?? ''} password={result.password} />
        ) : null}
      </form>
    </Card>
  )
}
