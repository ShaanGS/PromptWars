'use client'

import { useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Check } from '@phosphor-icons/react'
import type { InterestPrefs } from '@/config/interest-tags'
import type { EventRow } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand-mark'
import { cn } from '@/lib/utils'
import { bestImageUrl } from '@/lib/images'
import { displayTitle } from '@/lib/text'
import { TagGrid, PrefsForm } from './interest-picker'
import { completeOnboarding } from '@/app/(app)/welcome/actions'

/**
 * Three screens, phone first:
 *  1. What are you into? (tags, min 1)
 *  2. Where and when? (prefs)
 *  3. Tap the ones you'd go to (seed events -> 'interested' + signal)
 * One server action at the end; nothing is saved until "Done".
 */
export function OnboardingWizard({
  seedEvents,
  initialTags,
  initialPrefs,
}: {
  seedEvents: EventRow[]
  initialTags: string[]
  initialPrefs: InterestPrefs
}) {
  const [step, setStep] = useState(0)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [prefs, setPrefs] = useState<InterestPrefs>({
    area: 'chennai',
    mode: 'both',
    days: 'both',
    ...initialPrefs,
  })
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const total = 3
  const canNext = step === 0 ? tags.length > 0 : true

  function finish() {
    setError(null)
    start(async () => {
      const res = await completeOnboarding({ tags, prefs, seedEventIds: picked })
      if (res && !res.ok) setError(res.message)
    })
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas">
      <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between">
          <BrandMark size={30} />
          <ol className="flex items-center gap-1.5" aria-label="Progress">
            {Array.from({ length: total }).map((_, i) => (
              <li
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i <= step ? 'w-6 bg-ink' : 'w-3 bg-line-strong',
                )}
              />
            ))}
          </ol>
        </div>

        {step === 0 ? (
          <section className="mt-8">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
              What are you into?
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              Pick as many as you like. This is what the feed ranks up.
            </p>
            <div className="mt-6">
              <TagGrid value={tags} onChange={setTags} />
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-8">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
              Where and when?
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              Rough is fine. You can change this any time in Interests.
            </p>
            <div className="mt-6">
              <PrefsForm value={prefs} onChange={setPrefs} />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-8">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
              Tap the ones you&apos;d actually go to
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              Six that are on right now. Your taps are saved and teach the ranking. Skip if none.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {seedEvents.map((e) => {
                const on = picked.includes(e.id)
                const img = bestImageUrl(e.image_url)
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setPicked(on ? picked.filter((id) => id !== e.id) : [...picked, e.id])
                    }
                    className={cn(
                      'relative overflow-hidden rounded-card border bg-surface text-left transition-colors',
                      on
                        ? 'border-accent ring-2 ring-accent/30'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    <div className="relative aspect-[16/10] w-full bg-surface-2">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                      ) : null}
                      {on ? (
                        <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-accent text-white">
                          <Check size={14} weight="bold" />
                        </span>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">
                        {displayTitle(e.title)}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-ink-3">
                        {e.is_online ? 'Online' : (e.area ?? e.city ?? '')}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-ctl bg-danger-soft px-3.5 py-2.5 text-[13.5px] font-medium text-danger-ink">
            {error}
          </p>
        ) : null}

        {/* Sticky footer: thumb reach on a phone. */}
        <div
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-md"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex w-full max-w-[640px] items-center gap-2 px-4 py-3 sm:px-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} aria-label="Back">
                <ArrowLeft weight="bold" /> Back
              </Button>
            ) : (
              <span className="text-[13px] text-ink-3">
                Step {step + 1} of {total}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {step < total - 1 ? (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!canNext}
                  onClick={() => setStep(step + 1)}
                >
                  Next <ArrowRight weight="bold" />
                </Button>
              ) : (
                <Button variant="accent" size="lg" disabled={pending} onClick={finish}>
                  {pending ? 'Saving…' : picked.length ? `Done · ${picked.length} saved` : 'Done'}
                  <Check weight="bold" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
