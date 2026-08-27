'use client'

import { useState, useTransition } from 'react'
import type { InterestPrefs } from '@/config/interest-tags'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { FormNote } from '@/components/ui/field'
import { TagGrid, PrefsForm } from './interest-picker'
import { updateInterests } from '@/app/(app)/interests/actions'

/** /interests: the two onboarding controls on one page, with a Save. */
export function InterestsEditor({
  initialTags,
  initialPrefs,
}: {
  initialTags: string[]
  initialPrefs: InterestPrefs
}) {
  const [tags, setTags] = useState(initialTags)
  const [prefs, setPrefs] = useState<InterestPrefs>({
    area: 'chennai',
    mode: 'both',
    days: 'both',
    ...initialPrefs,
  })
  const [note, setNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function save() {
    setNote(null)
    start(async () => {
      const res = await updateInterests({ tags, prefs })
      setNote(
        res.ok
          ? { tone: 'ok', text: 'Saved. The feed re-ranks on the next load.' }
          : { tone: 'err', text: res.message },
      )
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>What you&apos;re into</CardTitle>
        <div className="mt-4">
          <TagGrid value={tags} onChange={setTags} />
        </div>
      </Card>
      <Card>
        <CardTitle>Where and when</CardTitle>
        <div className="mt-4">
          <PrefsForm value={prefs} onChange={setPrefs} />
        </div>
      </Card>
      <div className="flex items-center gap-3">
        <Button variant="primary" size="lg" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save interests'}
        </Button>
        {note ? <FormNote tone={note.tone}>{note.text}</FormNote> : null}
      </div>
    </div>
  )
}
