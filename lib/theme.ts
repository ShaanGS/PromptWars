/**
 * Relevance bands. Colour carries meaning -- how worth your time something
 * is -- not decoration. Classes are the design-system tokens.
 */
export interface Band {
  label: string
  chip: string
  dot: string
  card: string
}

export function bandFor(score: number | null): Band {
  if (score === null) {
    return {
      label: 'Unscored',
      chip: 'bg-surface-2 text-ink-2',
      dot: 'bg-line-strong',
      card: 'bg-surface',
    }
  }
  if (score >= 80) {
    return {
      label: 'Top pick',
      chip: 'bg-accent-soft text-accent-ink',
      dot: 'bg-accent',
      card: 'bg-surface',
    }
  }
  if (score >= 60) {
    return {
      label: 'Worth it',
      chip: 'bg-mint text-mint-ink',
      dot: 'bg-success',
      card: 'bg-surface',
    }
  }
  if (score >= 30) {
    return {
      label: 'Maybe',
      chip: 'bg-lemon text-lemon-ink',
      dot: 'bg-lemon-ink',
      card: 'bg-surface',
    }
  }
  return {
    label: 'Low',
    chip: 'bg-surface-2 text-ink-2',
    dot: 'bg-line-strong',
    card: 'bg-surface',
  }
}

/** Rotating pastel for date chips, keyed off the day. Fixed order, never random. */
const DATE_TINTS = [
  'bg-lilac text-lilac-ink',
  'bg-sky text-sky-ink',
  'bg-lemon text-lemon-ink',
  'bg-mint text-mint-ink',
  'bg-rose text-rose-ink',
  'bg-peach text-peach-ink',
]

export function dateTint(day: number): string {
  return DATE_TINTS[day % DATE_TINTS.length]
}
