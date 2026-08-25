'use client'

import { Check } from '@phosphor-icons/react'
import { INTEREST_TAGS, PREF_OPTIONS, type InterestPrefs } from '@/config/interest-tags'
import { toneClass } from '@/components/ui/bits'
import { Segmented } from '@/components/ui/segmented'
import { cn } from '@/lib/utils'

/**
 * The two controls shared by onboarding and /interests: the tag grid and
 * the where/when preferences. Controlled; the parent owns the state.
 */
export function TagGrid({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id])
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {INTEREST_TAGS.map((t) => {
        const on = value.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(t.id)}
            className={cn(
              'relative flex min-h-[84px] flex-col items-start justify-end rounded-card border p-3.5 text-left transition-colors',
              on
                ? cn('border-transparent', toneClass(t.tone))
                : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            {on ? (
              <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-ink text-white">
                <Check size={13} weight="bold" />
              </span>
            ) : null}
            <span className="text-[15.5px] font-semibold leading-tight">{t.label}</span>
            <span className={cn('mt-1 text-[12.5px]', on ? 'opacity-75' : 'text-ink-3')}>
              {t.blurb}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PrefsForm({
  value,
  onChange,
}: {
  value: InterestPrefs
  onChange: (prefs: InterestPrefs) => void
}) {
  return (
    <div className="space-y-6">
      <PrefRow label="How far will you go?">
        <Segmented
          aria-label="Area"
          value={value.area ?? 'chennai'}
          onChange={(area) => onChange({ ...value, area })}
          options={PREF_OPTIONS.area.map((o) => ({ value: o.value, label: o.label }))}
          className="w-full"
        />
      </PrefRow>
      <PrefRow label="In person or online?">
        <Segmented
          aria-label="Mode"
          value={value.mode ?? 'both'}
          onChange={(mode) => onChange({ ...value, mode })}
          options={PREF_OPTIONS.mode.map((o) => ({ value: o.value, label: o.label }))}
          className="w-full"
        />
      </PrefRow>
      <PrefRow label="When are you free?">
        <Segmented
          aria-label="Days"
          value={value.days ?? 'both'}
          onChange={(days) => onChange({ ...value, days })}
          options={PREF_OPTIONS.days.map((o) => ({ value: o.value, label: o.label }))}
          className="w-full"
        />
      </PrefRow>
    </div>
  )
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[14px] font-medium text-ink-2">{label}</p>
      {children}
    </div>
  )
}
