'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, SealCheck } from '@phosphor-icons/react'
import {
  canContinue,
  clampStep,
  EMPTY_DRAFT,
  isLastStep,
  ONBOARDING_STEPS,
  toggleSkill,
  type OnboardingDraft,
} from '@/lib/onboarding/steps'
import { UNVERIFIED_DAMP } from '@/lib/engine'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Wordmark } from '@/components/brand-mark'

/**
 * Guild's onboarding.
 *
 * It asks for the engine's four member inputs and explains, while asking,
 * why each one is scored -- the damp on an unproved claim, the fact that
 * shared hours are a term and not a filter. A judge watching this should be
 * able to predict the ranking before seeing it.
 *
 * Nothing is written. Identity in this build is the seeded profile (see
 * lib/demo.ts and SECURITY.md), and inserting a live 41st member would move
 * every number on the board mid-demo. The last step says so in plain words
 * rather than implying a save that did not happen.
 */
export function GuildWizard({
  skillVocabulary,
  meName,
}: {
  /** The exact skill strings the pool uses -- the engine matches on equality. */
  skillVocabulary: string[]
  meName: string | null
}) {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [draft, setDraft] = React.useState<OnboardingDraft>(EMPTY_DRAFT)

  const set = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const leave = () => {
    // A year is long enough that a judge who skips never sees this again on
    // the same device, and a cookie rather than a database row because there
    // is nowhere per-visitor to write to.
    document.cookie = 'guild-onboarded=1; path=/; max-age=31536000; samesite=lax'
    router.push('/teams')
  }

  const current = ONBOARDING_STEPS[clampStep(step)]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <Wordmark size="sm" />
        {/* Skip is present on every step, not buried at the end. Someone who
            wants the product rather than the form should never have to guess
            how to leave. */}
        <Button variant="ghost" size="sm" onClick={leave}>
          Skip
        </Button>
      </div>

      <ol className="mt-6 flex items-center gap-1.5" aria-label="Progress">
        {ONBOARDING_STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-accent' : 'bg-line',
            )}
          >
            <span className="sr-only">{`Step ${i + 1} of ${ONBOARDING_STEPS.length}: ${s}`}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex-1">
        {current === 'skills' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              What can you actually do?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              Pick what you would be comfortable owning on a team. Open squads are asking for the
              first few; the rest are what people in the pool already bring.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {skillVocabulary.map((skill) => {
                const on = draft.skills.includes(skill)
                return (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('skills', toggleSkill(draft.skills, skill))}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] font-medium transition-colors',
                      on
                        ? 'border-transparent bg-ink text-white'
                        : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {on ? <Check size={13} weight="bold" aria-hidden="true" /> : null}
                    {skill}
                  </button>
                )
              })}
            </div>

            <Card className="mt-6">
              <p className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                <SealCheck
                  aria-hidden="true"
                  weight="duotone"
                  className="mt-0.5 size-[18px] shrink-0 text-accent"
                />
                <span>
                  Later you can back a skill with a link to real work. A backed claim counts in
                  full; an unbacked one counts {UNVERIFIED_DAMP}× when a squad is scored — self
                  reported tags are the least reliable thing on a profile, so the model prices that
                  instead of trusting it.
                </span>
              </p>
            </Card>
          </section>
        ) : null}

        {current === 'availability' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              When are you free?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              Guild scores the hours a whole team shares, not the hours you have. A brilliant
              teammate who is never free when you are makes the team worse, and the ranking says so.
            </p>

            <div className="mt-6 space-y-6">
              <Field label="Which days">
                <Segmented
                  aria-label="Which days are you free"
                  value={draft.days}
                  onChange={(v) => set('days', v)}
                  options={[
                    { value: 'weekdays', label: 'Weekdays' },
                    { value: 'weekends', label: 'Weekends' },
                    { value: 'both', label: 'Both' },
                  ]}
                />
              </Field>

              <Field label={`Hours a week — ${draft.hoursPerWeek}`}>
                <input
                  type="range"
                  min={2}
                  max={30}
                  step={1}
                  value={draft.hoursPerWeek}
                  onChange={(e) => set('hoursPerWeek', Number(e.target.value))}
                  aria-label="Hours a week you can commit"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
                />
                <p className="mt-2 text-[12.5px] text-ink-3">
                  Ten hours a week of overlap scores full marks on that term.
                </p>
              </Field>
            </div>
          </section>
        ) : null}

        {current === 'experience' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              How much have you shipped?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              Neither answer is the good one. Guild rewards a team whose levels are close together,
              because a five-senior team argues and a one-senior team stalls.
            </p>

            <div className="mt-6 space-y-6">
              <Field label="Experience">
                <LevelPicker
                  label="Experience level"
                  value={draft.experienceLevel}
                  onChange={(v) => set('experienceLevel', v)}
                  low="First project"
                  high="Shipped a lot"
                />
              </Field>

              <Field label="Commitment for this one">
                <LevelPicker
                  label="Commitment level"
                  value={draft.commitmentLevel}
                  onChange={(v) => set('commitmentLevel', v)}
                  low="Curious"
                  high="All in"
                />
              </Field>
            </div>

            <Card className="mt-6">
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {meName
                  ? `This demo is read-only, so nothing here is saved. You'll explore as ${meName}, a seeded profile with a full history — that keeps every number on the board reproducible.`
                  : 'This demo is read-only, so nothing here is saved — that keeps every number on the board reproducible.'}
              </p>
            </Card>
          </section>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 pb-2">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft aria-hidden="true" weight="bold" />
            Back
          </Button>
        ) : (
          <span />
        )}

        {isLastStep(step) ? (
          <Button variant="accent" size="lg" onClick={leave}>
            See the Team Board
            <ArrowRight aria-hidden="true" weight="bold" />
          </Button>
        ) : (
          <Button
            variant="accent"
            size="lg"
            disabled={!canContinue(draft, step)}
            onClick={() => setStep(step + 1)}
          >
            Continue
            <ArrowRight aria-hidden="true" weight="bold" />
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</p>
      {children}
    </div>
  )
}

/** 1-5, the range the engine's experience and commitment levels take. */
function LevelPicker({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  low: string
  high: string
}) {
  return (
    <div>
      <div className="flex gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'h-11 flex-1 rounded-ctl border text-[15px] font-semibold tabular-nums transition-colors',
              value === n
                ? 'border-transparent bg-ink text-white'
                : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[12.5px] text-ink-3">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}
