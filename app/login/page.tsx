import { EnvelopeSimple, LockSimple } from '@phosphor-icons/react/dist/ssr'
import { BRAND } from '@/lib/brand'
import { Wordmark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Field, FormNote, IconInput } from '@/components/ui/field'
import { signIn } from './actions'

/**
 * Login -- the first screen on the new system (2c.1).
 *
 * One card, two fields, one button. Phone first: the card is the full width
 * minus gutters and the inputs are 48px tall; from `sm` it is a 400px card
 * centred on the canvas. Nothing here can mint an account.
 */
const MESSAGES: Record<string, { tone: 'ok' | 'err'; text: string }> = {
  invalid: { tone: 'err', text: 'Enter both your email and password.' },
  badcreds: { tone: 'err', text: 'Wrong email or password.' },
  authfail: { tone: 'err', text: 'Your session expired. Sign in again.' },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const message = errorKey ? (MESSAGES[errorKey] ?? MESSAGES.badcreds) : null

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center text-center">
          <h1>
            <Wordmark size="xl" />
          </h1>
          <p className="mt-3 text-[14.5px] text-ink-2">{BRAND.tagline}</p>
        </div>

        <form
          action={signIn}
          className="mt-8 space-y-5 rounded-panel border border-line bg-surface p-5 shadow-card sm:p-6"
        >
          <Field label="Email" htmlFor="email">
            <IconInput
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              icon={<EnvelopeSimple weight="bold" />}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <IconInput
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              icon={<LockSimple weight="bold" />}
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Sign in
          </Button>

          {message ? <FormNote tone={message.tone}>{message.text}</FormNote> : null}
        </form>

        <p className="mt-6 text-center text-[13.5px] leading-relaxed text-ink-2">Invite-only.</p>
      </div>
    </main>
  )
}
