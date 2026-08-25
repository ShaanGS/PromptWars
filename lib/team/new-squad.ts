/**
 * Validation for a posted request, kept pure so it can be tested and so the
 * form and the server action agree on one set of rules.
 *
 * The requirements are the reason this file is careful. They are not metadata:
 * `lib/engine/` scores every person in the pool against them, so a weight of 0,
 * a floor above 1, or a skill spelled `Machine Learning` when the pool says
 * `machine-learning` does not produce a slightly worse ranking -- it produces a
 * role that nobody on earth can fill, silently. Everything here exists to stop
 * a malformed requirement reaching the engine.
 */

export const SQUAD_KINDS = ['hackathon', 'research', 'startup', 'side_project'] as const
export type SquadKind = (typeof SQUAD_KINDS)[number]

/** The bands the seeded squads use; a free-text field here would not group. */
export const EFFORT_BANDS = ['5-10 hrs/week', '10-15 hrs/week', '15+ hrs/week'] as const
export type EffortBand = (typeof EFFORT_BANDS)[number]

export const MAX_REQUIREMENTS = 6
export const TITLE_MAX = 120
export const DESCRIPTION_MAX = 600
/** Long enough to be an ask rather than a placeholder. */
export const DESCRIPTION_MIN = 20
export const TITLE_MIN = 4

/** Matches the seeded rows: whole numbers, 1 = nice to have, 3 = the project. */
export const WEIGHT_MIN = 1
export const WEIGHT_MAX = 5

export type RequirementDraft = {
  skill: string
  roleLabel: string
  weight: string | number
  minProficiency: string | number
}

export type SquadDraft = {
  title: string
  description: string
  eventId: string | null
  kind: string
  effort: string
  requirements: RequirementDraft[]
}

export type CleanRequirement = {
  skill: string
  roleLabel: string | null
  weight: number
  minProficiency: number
}

export type CleanSquad = {
  title: string
  description: string
  eventId: string | null
  kind: SquadKind
  effort: EffortBand
  requirements: CleanRequirement[]
}

export type FieldError = { field: string; message: string }

export type Validated = { ok: true; value: CleanSquad } | { ok: false; errors: FieldError[] }

/**
 * Skills are stored kebab-case (`machine-learning`, `ui-ux`) because that is
 * what `skills.skill` holds and the engine compares them with `===`. A picked
 * option already arrives in that shape; this exists for typed-in ones.
 */
export function normaliseSkill(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** `machine-learning` -> `Machine Learning`, for a row left without a label. */
export function labelFromSkill(skill: string): string {
  return skill
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function toNumber(value: string | number): number | null {
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

/** A row the poster started and abandoned is not an error -- it is not a row. */
function isBlank(r: RequirementDraft): boolean {
  return !r.skill.trim() && !r.roleLabel.trim()
}

export function validateSquadDraft(draft: SquadDraft): Validated {
  const errors: FieldError[] = []

  const title = draft.title.trim().replace(/\s+/g, ' ')
  if (title.length < TITLE_MIN) {
    errors.push({ field: 'title', message: `Give it a name of at least ${TITLE_MIN} characters.` })
  } else if (title.length > TITLE_MAX) {
    errors.push({ field: 'title', message: `Keep the name under ${TITLE_MAX} characters.` })
  }

  const description = draft.description.trim()
  if (description.length < DESCRIPTION_MIN) {
    errors.push({
      field: 'description',
      message: `Say what you are building in at least ${DESCRIPTION_MIN} characters — this is what people read first.`,
    })
  } else if (description.length > DESCRIPTION_MAX) {
    errors.push({
      field: 'description',
      message: `Keep it under ${DESCRIPTION_MAX} characters.`,
    })
  }

  const kind = SQUAD_KINDS.find((k) => k === draft.kind)
  if (!kind) errors.push({ field: 'kind', message: 'Pick what kind of project this is.' })

  const effort = EFFORT_BANDS.find((e) => e === draft.effort)
  if (!effort) errors.push({ field: 'effort', message: 'Pick roughly how much time this takes.' })

  const rows = draft.requirements.filter((r) => !isBlank(r))
  if (rows.length === 0) {
    errors.push({
      field: 'requirements',
      message: 'Add at least one role — the ranking has nothing to score without it.',
    })
  } else if (rows.length > MAX_REQUIREMENTS) {
    errors.push({
      field: 'requirements',
      message: `${MAX_REQUIREMENTS} roles is the most a squad can ask for.`,
    })
  }

  const requirements: CleanRequirement[] = []
  const seenLabels = new Set<string>()

  rows.slice(0, MAX_REQUIREMENTS).forEach((row, i) => {
    const skill = normaliseSkill(row.skill)
    if (!skill) {
      errors.push({ field: `requirements.${i}.skill`, message: 'Pick a skill for this role.' })
      return
    }

    const roleLabel = row.roleLabel.trim().replace(/\s+/g, ' ') || labelFromSkill(skill)
    // Two rows named "Backend" are two identical open slots on the card and in
    // the sandbox, with nothing to tell them apart. Two rows asking for the
    // same *skill* under different names is fine -- that is two seats.
    const key = roleLabel.toLowerCase()
    if (seenLabels.has(key)) {
      errors.push({
        field: `requirements.${i}.roleLabel`,
        message: `"${roleLabel}" is already one of the roles — give this one its own name.`,
      })
      return
    }
    seenLabels.add(key)

    const weight = toNumber(row.weight)
    if (weight === null || weight < WEIGHT_MIN || weight > WEIGHT_MAX) {
      errors.push({
        field: `requirements.${i}.weight`,
        message: `How much it matters runs ${WEIGHT_MIN} to ${WEIGHT_MAX}.`,
      })
      return
    }

    const minProficiency = toNumber(row.minProficiency)
    if (minProficiency === null || minProficiency < 0 || minProficiency > 1) {
      errors.push({
        field: `requirements.${i}.minProficiency`,
        message: 'The minimum runs from 0 to 1.',
      })
      return
    }

    requirements.push({
      skill,
      roleLabel,
      weight: Math.round(weight),
      // Two decimals: the control steps in tenths, and a float artefact would
      // land in a CHECK-constrained column.
      minProficiency: Math.round(minProficiency * 100) / 100,
    })
  })

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      title,
      description,
      eventId: draft.eventId?.trim() || null,
      kind: kind as SquadKind,
      effort: effort as EffortBand,
      requirements,
    },
  }
}
