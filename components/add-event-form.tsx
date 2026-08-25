'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MagicWand } from '@phosphor-icons/react'
import { extractAction, saveManualEvent, type SaveInput } from '@/app/(app)/admin/add/actions'
import { Button } from '@/components/ui/button'
import { Field, FormNote, Input, inputClass } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * Paste → draft → correct → save. The LLM only drafts; nothing is written
 * until the admin has seen every field. Extraction failing (or being
 * skipped) leaves a plain hand-fillable form, so the LLM is a convenience,
 * never a gate.
 */

const EMPTY: SaveInput = {
  title: '',
  description: '',
  url: '',
  date: '',
  time: '',
  endDate: '',
  venue: '',
  city: '',
  isOnline: false,
  priceType: 'unknown',
  organizer: '',
  tags: '',
}

export function AddEventForm({ initialText = '' }: { initialText?: string }) {
  const router = useRouter()
  const [pasted, setPasted] = useState(initialText)
  const [fields, setFields] = useState<SaveInput>(EMPTY)
  const [drafted, setDrafted] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [extracting, startExtract] = useTransition()
  const [saving, startSave] = useTransition()

  const set = (patch: Partial<SaveInput>) => setFields((f) => ({ ...f, ...patch }))

  function extract() {
    startExtract(async () => {
      setNote(null)
      const res = await extractAction(pasted)
      if ('error' in res) {
        setNote({ tone: 'err', text: res.error })
        setDrafted(true) // still open the form for hand-filling
        return
      }
      const d = res.draft
      setFields({
        title: d.title ?? '',
        description: d.description ?? '',
        url: d.url ?? '',
        date: d.date ?? '',
        time: d.time ?? '',
        endDate: d.endDate ?? '',
        venue: d.venue ?? '',
        city: d.city ?? '',
        isOnline: d.isOnline,
        priceType: d.priceType,
        organizer: d.organizer ?? '',
        tags: d.tags.join(', '),
      })
      setDrafted(true)
      setNote({ tone: 'ok', text: 'Drafted. Check every field — the model can misread a post.' })
    })
  }

  function save() {
    startSave(async () => {
      setNote(null)
      const res = await saveManualEvent(fields)
      if ('error' in res) {
        setNote({ tone: 'err', text: res.error })
        return
      }
      router.push(`/event/${res.id}`)
    })
  }

  return (
    <div className="grid gap-5">
      <Field
        label="Paste the post"
        htmlFor="pasted"
        hint="A LinkedIn post, a WhatsApp forward, poster text — anything that describes the event."
      >
        <textarea
          id="pasted"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={6}
          className={cn(inputClass, 'h-auto py-3 leading-relaxed')}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={extract} disabled={extracting}>
          <MagicWand weight="bold" />
          {extracting ? 'Drafting…' : 'Draft the fields'}
        </Button>
        {!drafted ? (
          <Button type="button" variant="secondary" onClick={() => setDrafted(true)}>
            Fill in by hand
          </Button>
        ) : null}
      </div>

      {note ? <FormNote tone={note.tone}>{note.text}</FormNote> : null}

      {drafted ? (
        <div className="grid gap-4 border-t border-line pt-5">
          <Field label="Title" htmlFor="f-title">
            <Input
              id="f-title"
              value={fields.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <Field label="Link" htmlFor="f-url" hint="Registration or info page.">
            <Input
              id="f-url"
              type="url"
              value={fields.url}
              onChange={(e) => set({ url: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Date" htmlFor="f-date">
              <Input
                id="f-date"
                type="date"
                value={fields.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </Field>
            <Field label="Time" htmlFor="f-time" optional>
              <Input
                id="f-time"
                type="time"
                value={fields.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </Field>
            <Field label="Ends" htmlFor="f-end" optional className="col-span-2 sm:col-span-1">
              <Input
                id="f-end"
                type="date"
                value={fields.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Venue" htmlFor="f-venue" optional>
              <Input
                id="f-venue"
                value={fields.venue}
                onChange={(e) => set({ venue: e.target.value })}
              />
            </Field>
            <Field label="City" htmlFor="f-city" optional>
              <Input
                id="f-city"
                value={fields.city}
                onChange={(e) => set({ city: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Organizer" htmlFor="f-org" optional>
              <Input
                id="f-org"
                value={fields.organizer}
                onChange={(e) => set({ organizer: e.target.value })}
              />
            </Field>
            <Field label="Tags" htmlFor="f-tags" optional hint="Comma-separated.">
              <Input
                id="f-tags"
                value={fields.tags}
                onChange={(e) => set({ tags: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Price" htmlFor="f-price">
              <select
                id="f-price"
                value={fields.priceType}
                onChange={(e) => set({ priceType: e.target.value })}
                className={cn(inputClass, 'w-auto pr-8')}
              >
                <option value="unknown">Unknown</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
            <label className="flex h-11 items-center gap-2 text-[14.5px] text-ink">
              <input
                type="checkbox"
                checked={fields.isOnline}
                onChange={(e) => set({ isOnline: e.target.checked })}
                className="size-4 accent-[#5b5bd6]"
              />
              Online event
            </label>
          </div>
          <Field label="Description" htmlFor="f-desc" optional>
            <textarea
              id="f-desc"
              value={fields.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              className={cn(inputClass, 'h-auto py-3 leading-relaxed')}
            />
          </Field>
          <div>
            <Button type="button" variant="primary" size="lg" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Add to the feed'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
