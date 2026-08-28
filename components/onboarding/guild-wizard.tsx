'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flask,
  GithubLogo,
  Globe,
  Handshake,
  Rocket,
  SealCheck,
  Trophy,
  Wrench,
} from '@phosphor-icons/react'
import {
  canContinue,
  clampStep,
  EMPTY_DRAFT,
  isLastStep,
  LOOKING_FOR,
  ONBOARDING_STEPS,
  toggleSkill,
  type LookingFor,
  type OnboardingDraft,
} from '@/lib/onboarding/steps'
import { UNVERIFIED_DAMP } from '@/lib/engine'
import { summariseAvailability } from '@/lib/team/availability-summary'
import { toAvailabilityWindows } from '@/lib/onboarding/draft'
import { createProfile } from '@/app/(app)/welcome/actions'
import { linkGitHub } from '@/app/(app)/welcome/github'
import { Input, inputClass } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, toneClass } from '@/components/ui/bits'
import { Card } from '@/components/ui/card'
import { Pill, toneFor } from '@/components/ui/pill'
import { Segmented } from '@/components/ui/segmented'

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
/**
 * The six intents, in the first person. "I want to compete" is a sentence
 * someone recognises about themselves; "Hackathon Team" is a category they
 * have to translate into one.
 */
const LOOKING_OPTIONS: { value: LookingFor; blurb: string; icon: typeof Trophy }[] = [
  { value: LOOKING_FOR[0], blurb: 'I want to compete', icon: Trophy },
  { value: LOOKING_FOR[1], blurb: 'I want to publish or explore', icon: Flask },
  { value: LOOKING_FOR[2], blurb: "I'm building something", icon: Rocket },
  { value: LOOKING_FOR[3], blurb: 'I want to make something cool', icon: Wrench },
  { value: LOOKING_FOR[4], blurb: 'I want to grow with others', icon: Handshake },
  { value: LOOKING_FOR[5], blurb: 'Surprise me', icon: Globe },
]

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
  const [error, setError] = React.useState<string | null>(null)
  const [gh, setGh] = React.useState('')
  const [ghNote, setGhNote] = React.useState<string | null>(null)
  const [ghBusy, setGhBusy] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const set = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  /**
   * Toggling reads the draft inside the updater, never from the render that
   * queued it. Two chips tapped inside one frame both computed their next
   * array from the same stale value, so the second silently discarded the
   * first -- a skill the person watched themselves select never reached the
   * profile.
   */
  /**
   * The one place a claim stops being self-reported. What comes back is
   * written straight into the draft with the repo as its proof, so the
   * damp never applies to it -- which is why the button says what it found
   * rather than just ticking chips silently.
   */
  const lookupGitHub = async () => {
    if (!gh.trim() || ghBusy) return
    setGhBusy(true)
    setGhNote(null)
    const res = await linkGitHub(gh)
    setGhBusy(false)
    if (!res.ok) {
      setGhNote(res.message)
      return
    }
    setDraft((d) => ({
      ...d,
      githubLogin: res.login,
      githubEvidence: res.evidence,
      skills: [...new Set([...d.skills, ...res.evidence.map((e) => e.skill)])],
    }))
    setGhNote(`Read ${res.login}'s public repos — ${res.evidence.length} skills backed.`)
  }

  const toggle = (skill: string) =>
    setDraft((d) => ({ ...d, skills: toggleSkill(d.skills, skill) }))

  const markSeen = () => {
    // A year is long enough that somebody who skips never sees this again on
    // the same device, and a cookie rather than a row because a skipper has
    // no profile to write the fact to.
    document.cookie = 'guild-onboarded=1; path=/; max-age=31536000; samesite=lax'
  }

  /** Skip: no profile, straight to the board as the seeded identity. */
  const skip = () => {
    markSeen()
    router.push('/teams')
  }

  /**
   * Finish: writes a real row. The redirect is to the new profile rather
   * than the board, because the point being made is "that person now
   * exists and is ranked", and the profile is where the score is shown.
   */
  const finish = () => {
    setError(null)
    startTransition(async () => {
      const res = await createProfile(draft)
      if (!res.ok) {
        setError(res.errors[0]?.message ?? 'Could not save that.')
        return
      }
      markSeen()
      router.push(`/p/${res.handle}`)
      router.refresh()
    })
  }

  // Step moves through the updater for the same reason toggling does: two
  // taps inside one frame both computed their next index from the render that
  // queued them, so the second was a no-op and the wizard appeared stuck.
  const current = ONBOARDING_STEPS[clampStep(step)]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pb-28 pt-8 sm:pt-12 lg:pb-16">
      {/* No wordmark here: the shell already renders one, in the sidebar on
          desktop and the top bar on a phone. Skip is present on every step
          rather than buried at the end -- someone who wants the product and
          not the form should never have to guess how to leave. */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-2">
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </p>
        <Button variant="ghost" size="sm" onClick={skip} disabled={pending}>
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
        {current === 'about' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              First, who are you?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              This is the name a team sees when you turn up in their ranking.
            </p>

            <div className="mt-5">
              <label
                htmlFor="ob-name"
                className="mb-2 block text-[13px] font-medium uppercase tracking-[0.06em] text-ink-3"
              >
                Your name
              </label>
              <Input
                id="ob-name"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Shaan Guru"
                autoComplete="name"
                maxLength={60}
              />

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                <div>
                  <label htmlFor="ob-dept" className="sr-only">
                    Course or department
                  </label>
                  <Input
                    id="ob-dept"
                    value={draft.dept}
                    onChange={(e) => set('dept', e.target.value)}
                    placeholder="CSE"
                    maxLength={40}
                  />
                </div>
                <div>
                  <label htmlFor="ob-year" className="sr-only">
                    Year of study
                  </label>
                  {/* String on both sides. A number `value` against string
                      option values does not match, and the select silently
                      falls back to the first option -- so anyone who left the
                      default alone was written down as Year 1. */}
                  <select
                    id="ob-year"
                    value={String(draft.year)}
                    onChange={(e) => set('year', Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={String(y)}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {current === 'skills' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              What can you actually do?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              Pick what you would be comfortable owning. Open teams are asking for the first few;
              the rest are what people here already bring.
            </p>

            <div className="mt-5 rounded-card border border-line bg-surface p-4">
              <label
                htmlFor="ob-gh"
                className="flex items-center gap-2 text-[14px] font-medium text-ink"
              >
                <GithubLogo aria-hidden="true" weight="fill" className="size-[18px]" />
                Have a GitHub?
              </label>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                We read your public repos and back those skills with the repo that proves them.
                Backed claims count in full instead of {UNVERIFIED_DAMP}×.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  id="ob-gh"
                  value={gh}
                  onChange={(e) => setGh(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void lookupGitHub()
                    }
                  }}
                  placeholder="your-username"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  type="button"
                  onClick={() => void lookupGitHub()}
                  disabled={ghBusy || !gh.trim()}
                >
                  {ghBusy ? 'Reading…' : 'Read repos'}
                </Button>
              </div>
              {ghNote ? (
                <p role="status" className="mt-2 text-[13px] text-ink-2">
                  {ghNote}
                </p>
              ) : null}

              {draft.githubEvidence.length ? (
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                  {draft.githubEvidence.map((e) => (
                    <li key={e.skill} className="flex items-center gap-2 text-[13px]">
                      <Pill tone="mint" size="sm">
                        <SealCheck aria-hidden="true" weight="fill" />
                        {e.skill}
                      </Pill>
                      <a
                        href={e.proofUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                      >
                        {e.reason}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {skillVocabulary.map((skill) => {
                const on = draft.skills.includes(skill)
                return (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(skill)}
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
                  full; an unbacked one counts {UNVERIFIED_DAMP}× when a team is scored — self
                  reported tags are the least reliable thing on a profile, so the model prices that
                  instead of trusting it.
                </span>
              </p>
            </Card>
          </section>
        ) : null}

        {current === 'looking' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              What are you looking for right now?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              This is what people filter by when they go looking for someone.
            </p>

            {/* radiogroup, not a row of buttons: these six are one choice, and
                a screen reader should hear "3 of 6" rather than six unrelated
                toggles. */}
            <div
              role="radiogroup"
              aria-label="What are you looking for"
              className="mt-5 grid gap-3 sm:grid-cols-2"
            >
              {LOOKING_OPTIONS.map(({ value, blurb, icon: Icon }) => {
                const on = draft.lookingFor === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('lookingFor', value)}
                    className={cn(
                      'rounded-card border p-4 text-left transition-colors',
                      on
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:border-line-strong',
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      weight="duotone"
                      className={cn('size-6', on ? 'text-accent' : 'text-ink-3')}
                    />
                    <p className="mt-2 text-[15.5px] font-semibold text-ink">{value}</p>
                    <p className="mt-0.5 text-[13.5px] text-ink-2">{blurb}</p>
                  </button>
                )
              })}
            </div>
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
          </section>
        ) : null}

        {current === 'review' ? (
          <section>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
              Here&apos;s how you appear to others
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              Check it before you go live.
            </p>

            {/* The same anatomy the directory card uses -- band, portrait
                across it, then the facts -- so this is a preview rather than
                an artist's impression of one. */}
            <article className="mt-5 overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <div className={cn('h-16', toneClass(toneFor(draft.name || 'guild')))} />
              <div className="px-4 pb-4">
                <div className="-mt-8">
                  <Avatar name={draft.name || 'You'} size={64} className="ring-4 ring-surface" />
                </div>
                <h2 className="mt-2.5 text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  {draft.name || 'Your name'}
                </h2>
                <p className="mt-0.5 text-[13.5px] text-ink-2">
                  {[draft.dept || 'Student', `Year ${draft.year}`].join(' · ')}
                </p>

                <ReviewGroup label="Looking for">
                  <Pill tone="lilac" size="sm">
                    {draft.lookingFor}
                  </Pill>
                </ReviewGroup>

                <ReviewGroup label="Skills">
                  {draft.skills.length ? (
                    draft.skills.map((skill) => (
                      // No seal here: a claim made two minutes ago has nothing
                      // backing it yet, and the model prices it accordingly.
                      <Pill key={skill} tone="neutral" size="sm">
                        {skill}
                      </Pill>
                    ))
                  ) : (
                    <Pill tone="outline" size="sm">
                      None picked
                    </Pill>
                  )}
                </ReviewGroup>

                <ReviewGroup label="Availability">
                  <Pill tone="neutral" size="sm">
                    {summariseAvailability(toAvailabilityWindows(draft)) ?? 'Not set'}
                  </Pill>
                </ReviewGroup>

                <ReviewGroup label="Experience & commitment">
                  <Pill tone="neutral" size="sm">
                    Experience {draft.experienceLevel}/5
                  </Pill>
                  <Pill tone="neutral" size="sm">
                    Commitment {draft.commitmentLevel}/5
                  </Pill>
                </ReviewGroup>
              </div>
            </article>

            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">
              This creates a real profile. Every open team re-ranks against it the moment you join.
              {meName ? ` Skip instead and you explore as ${meName}, the seeded profile.` : ''}
            </p>
          </section>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[13.5px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3 pb-2">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((n) => clampStep(n - 1))}>
            <ArrowLeft aria-hidden="true" weight="bold" />
            Back
          </Button>
        ) : (
          <span />
        )}

        {isLastStep(step) ? (
          <Button variant="accent" size="lg" onClick={finish} disabled={pending}>
            {pending ? 'Creating…' : 'Create my profile'}
            <ArrowRight aria-hidden="true" weight="bold" />
          </Button>
        ) : (
          <Button
            variant="accent"
            size="lg"
            disabled={!canContinue(draft, step)}
            onClick={() => setStep((n) => clampStep(n + 1))}
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

function ReviewGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3.5">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.07em] text-ink-3">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
