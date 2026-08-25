'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash, UsersThree, WarningCircle } from '@phosphor-icons/react'
import { effectiveProficiency, type SkillClaim } from '@/lib/engine'
import {
  EFFORT_BANDS,
  MAX_REQUIREMENTS,
  SQUAD_KINDS,
  TITLE_MAX,
  DESCRIPTION_MAX,
  labelFromSkill,
  normaliseSkill,
  validateSquadDraft,
  WEIGHT_MAX,
  WEIGHT_MIN,
  type RequirementDraft,
  type SquadDraft,
} from '@/lib/team/new-squad'
import { createSquad } from '@/app/(app)/teams/new/actions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FormNote, Input, Label, inputClass } from '@/components/ui/field'

/** The pool's claims for one skill, so the form can say who could fill a role. */
export type SkillSupply = Record<string, Pick<SkillClaim, 'proficiency' | 'verified'>[]>

export type EventOption = { id: string; title: string; when: string | null }

const KIND_LABELS: Record<(typeof SQUAD_KINDS)[number], string> = {
  hackathon: 'Hackathon',
  research: 'Research project',
  startup: 'Startup',
  side_project: 'Side project',
}

/** The floors the seeded squads use, phrased as what they mean. */
const FLOORS = [
  { value: '0', label: 'Anyone' },
  { value: '0.3', label: 'Some experience' },
  { value: '0.4', label: 'Comfortable' },
  { value: '0.5', label: 'Solid' },
  { value: '0.7', label: 'Strong' },
]

const WEIGHTS = [
  { value: '1', label: '1 — nice to have' },
  { value: '2', label: '2 — matters' },
  { value: '3', label: '3 — the project needs it' },
  { value: '4', label: '4 — critical' },
  { value: '5', label: '5 — without this there is no project' },
]

const BLANK: RequirementDraft = { skill: '', roleLabel: '', weight: '2', minProficiency: '0.4' }

export function NewSquadForm({ events, supply }: { events: EventOption[]; supply: SkillSupply }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventId, setEventId] = useState('')
  const [kind, setKind] = useState<string>('hackathon')
  const [effort, setEffort] = useState<string>('10-15 hrs/week')
  const [rows, setRows] = useState<RequirementDraft[]>([{ ...BLANK }])
  // Errors from the last submit only. Validating every keystroke would shout
  // "too short" at someone who has typed three characters of a title.
  const [errors, setErrors] = useState<Record<string, string>>({})

  const skills = useMemo(() => Object.keys(supply).sort(), [supply])

  const draft: SquadDraft = {
    title,
    description,
    eventId: eventId || null,
    kind,
    effort,
    requirements: rows,
  }

  function setRow(i: number, patch: Partial<RequirementDraft>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function submit() {
    const parsed = validateSquadDraft(draft)
    if (!parsed.ok) {
      setErrors(Object.fromEntries(parsed.errors.map((e) => [e.field, e.message])))
      return
    }
    setErrors({})
    start(async () => {
      const res = await createSquad(draft)
      if (!res.ok) {
        setErrors(Object.fromEntries(res.errors.map((e) => [e.field, e.message])))
        return
      }
      router.push(`/squad/${res.id}`)
    })
  }

  return (
    <form
      className="mt-6 max-w-3xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {/* One datalist for every row rather than one per field. */}
      <datalist id="guild-skill-vocabulary">
        {skills.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <Card className="space-y-5 p-5 sm:p-6">
        <Field
          label="What are you building?"
          htmlFor="sq-title"
          error={errors.title}
          hint={`${title.trim().length}/${TITLE_MAX}`}
        >
          <Input
            id="sq-title"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="CropGuard — on-device crop disease detection"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field
          label="The ask"
          htmlFor="sq-desc"
          error={errors.description}
          hint={`What exists, what is missing, why it is worth someone's weekend. ${description.trim().length}/${DESCRIPTION_MAX}`}
        >
          <textarea
            id="sq-desc"
            value={description}
            rows={4}
            maxLength={DESCRIPTION_MAX}
            placeholder="The model is half-trained. It needs a face, an API and a story."
            onChange={(e) => setDescription(e.target.value)}
            className={cn(inputClass, 'h-auto py-3 leading-relaxed')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What kind" htmlFor="sq-kind" error={errors.kind}>
            <select
              id="sq-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={inputClass}
            >
              {SQUAD_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Time it takes" htmlFor="sq-effort" error={errors.effort}>
            <select
              id="sq-effort"
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
              className={inputClass}
            >
              {EFFORT_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="For which event"
          htmlFor="sq-event"
          optional
          error={errors.eventId}
          hint="Squads aimed at an event show its name on the board."
        >
          <select
            id="sq-event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className={inputClass}
          >
            <option value="">Not tied to an event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
                {e.when ? ` · ${e.when}` : ''}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card className="space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">What it needs</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            These are what the ranking scores. Every person in the pool is measured against them, so
            the weight and the minimum are the request — not decoration.
          </p>
        </div>

        {errors.requirements ? <FormNote tone="err">{errors.requirements}</FormNote> : null}

        <div className="space-y-3">
          {rows.map((row, i) => (
            <RequirementRow
              key={i}
              index={i}
              row={row}
              supply={supply}
              errors={errors}
              canRemove={rows.length > 1}
              onChange={(patch) => setRow(i, patch)}
              onRemove={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>

        {rows.length < MAX_REQUIREMENTS ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRows((p) => [...p, { ...BLANK }])}
          >
            <Plus weight="bold" />
            Add a role
          </Button>
        ) : (
          <p className="text-[13px] text-ink-3">{MAX_REQUIREMENTS} roles is the maximum.</p>
        )}
      </Card>

      {errors.form ? <FormNote tone="err">{errors.form}</FormNote> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Posting…' : 'Post the request'}
        </Button>
        <p className="text-[13px] text-ink-3">
          It appears on the Team Board immediately, ranked for everyone by what they would add.
        </p>
      </div>
    </form>
  )
}

function RequirementRow({
  index,
  row,
  supply,
  errors,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number
  row: RequirementDraft
  supply: SkillSupply
  errors: Record<string, string>
  canRemove: boolean
  onChange: (patch: Partial<RequirementDraft>) => void
  onRemove: () => void
}) {
  const skill = normaliseSkill(row.skill)
  const floor = Number(row.minProficiency)

  // The same test lib/engine/coverage.ts applies: a claim counts toward a
  // requirement only once damping for an absent proof link has been applied.
  // Running it here means the number on screen is the engine's answer, not an
  // approximation of it.
  const claims = supply[skill]
  const clearing = claims?.filter((c) => effectiveProficiency(c as SkillClaim) >= floor).length ?? 0

  const skillError = errors[`requirements.${index}.skill`]
  const labelError = errors[`requirements.${index}.roleLabel`]

  return (
    <div className="rounded-ctl border border-line bg-surface-2/50 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium uppercase tracking-wide text-ink-3">
          Role {index + 1}
        </span>
        {canRemove ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove role ${index + 1}`}
          >
            <Trash weight="bold" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Skill" htmlFor={`req-${index}-skill`} error={skillError}>
          <input
            id={`req-${index}-skill`}
            list="guild-skill-vocabulary"
            value={row.skill}
            placeholder="react"
            onChange={(e) => onChange({ skill: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field
          label="Call the role"
          htmlFor={`req-${index}-label`}
          optional
          error={labelError}
          hint={skill && !row.roleLabel.trim() ? `Will read "${labelFromSkill(skill)}"` : undefined}
        >
          <Input
            id={`req-${index}-label`}
            value={row.roleLabel}
            placeholder="Frontend"
            onChange={(e) => onChange({ roleLabel: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor={`req-${index}-weight`}>How much it matters</Label>
          <select
            id={`req-${index}-weight`}
            value={String(row.weight)}
            onChange={(e) => onChange({ weight: e.target.value })}
            className={inputClass}
          >
            {WEIGHTS.filter(
              (w) => Number(w.value) >= WEIGHT_MIN && Number(w.value) <= WEIGHT_MAX,
            ).map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`req-${index}-floor`}>Minimum level</Label>
          <select
            id={`req-${index}-floor`}
            value={String(row.minProficiency)}
            onChange={(e) => onChange({ minProficiency: e.target.value })}
            className={inputClass}
          >
            {FLOORS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {skill ? <Supply skill={skill} known={claims !== undefined} clearing={clearing} /> : null}
    </div>
  )
}

/**
 * How many people could actually fill this role, live.
 *
 * A request whose skill nobody claims is not rejected -- posting for something
 * rare is legitimate, and the pool grows. But it is the one mistake that
 * produces a squad the ranking can never help, so it is said out loud before
 * the request is posted rather than discovered on an empty board afterwards.
 */
function Supply({ skill, known, clearing }: { skill: string; known: boolean; clearing: number }) {
  if (!known) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-[13px] text-warning-ink">
        <WarningCircle aria-hidden="true" size={15} weight="bold" />
        Nobody in the pool claims <span className="font-medium">{skill}</span> yet — this slot will
        stay open.
      </p>
    )
  }
  return (
    <p
      className={cn(
        'mt-3 flex items-center gap-1.5 text-[13px]',
        clearing === 0 ? 'text-warning-ink' : 'text-ink-2',
      )}
    >
      {clearing === 0 ? (
        <WarningCircle aria-hidden="true" size={15} weight="bold" />
      ) : (
        <UsersThree aria-hidden="true" size={15} weight="bold" className="text-ink-3" />
      )}
      <span>
        <span className="font-medium tabular-nums text-ink">{clearing}</span>{' '}
        {clearing === 1 ? 'person clears' : 'people clear'} this minimum
        {clearing === 0 ? ' — lower it, or expect the slot to stay open' : ''}
      </span>
    </p>
  )
}
