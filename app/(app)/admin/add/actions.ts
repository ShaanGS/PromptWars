'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase'
import { buildManualRow, extractDraft, type ExtractedDraft } from '@/lib/pipeline/manual'

/** LLM draft from pasted text. Never writes anything — the admin confirms. */
export async function extractAction(
  pasted: string,
): Promise<{ draft: ExtractedDraft } | { error: string }> {
  await requireAdmin()
  const text = pasted.trim()
  if (text.length < 20) return { error: 'Paste a bit more — that is too short to be an event.' }
  try {
    return { draft: await extractDraft(text) }
  } catch (err) {
    // The LLM being down must not block a hand-add; the form stays fillable.
    return {
      error: `Extraction failed (${err instanceof Error ? err.message : err}). Fill in by hand.`,
    }
  }
}

export interface SaveInput {
  title: string
  description: string
  url: string
  date: string
  time: string
  endDate: string
  venue: string
  city: string
  isOnline: boolean
  priceType: string
  organizer: string
  tags: string
}

export async function saveManualEvent(
  input: SaveInput,
): Promise<{ id: string } | { error: string }> {
  const admin = await requireAdmin()

  const title = input.title.trim()
  const url = input.url.trim()
  if (!title) return { error: 'A title is required.' }
  if (!/^https?:\/\//i.test(url)) return { error: 'A registration or info link is required.' }

  let row
  try {
    row = buildManualRow({
      title,
      description: input.description.trim() || null,
      url,
      date: input.date || null,
      time: input.time || null,
      endDate: input.endDate || null,
      venue: input.venue.trim() || null,
      city: input.city.trim() || null,
      isOnline: input.isOnline,
      priceType:
        input.priceType === 'free' || input.priceType === 'paid' ? input.priceType : 'unknown',
      organizer: input.organizer.trim() || null,
      tags: input.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }

  const db = createServiceClient()
  const { data, error } = await db.from('events').insert(row).select('id').single()
  if (error) return { error: `Saving failed: ${error.message}` }

  // A hand-add is this source's "run" — it keeps /sources honest about
  // when the manual channel last produced something.
  await db.from('scrape_runs').insert({
    source_id: 'manual',
    status: 'ok',
    finished_at: new Date().toISOString(),
    listings_found: 1,
    error: null,
  })

  // No access_audit row: that table's check constraint scopes it to account
  // actions. `source_id = 'manual'` plus the run row IS the trail here.
  void admin

  revalidatePath('/', 'layout')
  return { id: data.id as string }
}
