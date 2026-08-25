'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase'

export async function dismissLead(id: number): Promise<void> {
  await requireAdmin()
  const db = createServiceClient()
  await db
    .from('discovery_leads')
    .update({ status: 'dismissed', decided_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin/discovery')
}

/** Mark used and hand the lead's text to paste-to-event, prefilled. */
export async function useLead(id: number): Promise<void> {
  await requireAdmin()
  const db = createServiceClient()
  const { data } = await db
    .from('discovery_leads')
    .select('title, snippet, url')
    .eq('id', id)
    .single()
  await db
    .from('discovery_leads')
    .update({ status: 'used', decided_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin/discovery')
  const text = [data?.title, data?.snippet, data?.url].filter(Boolean).join('\n\n')
  redirect(`/admin/add?text=${encodeURIComponent(text)}`)
}
