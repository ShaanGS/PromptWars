import { connection } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getDemoProfile } from '@/lib/demo'
import { GuildWizard } from '@/components/onboarding/guild-wizard'

/**
 * /welcome -- onboarding.
 *
 * The skill chips are read from the database rather than hard-coded, for the
 * same reason the sandbox re-runs the real engine instead of showing a mock:
 * the engine matches skills by exact string equality, so a curated list that
 * drifted from the corpus would offer someone a skill no requirement can ever
 * match. What is asked for by a live squad is offered first.
 *
 * Reached from the root when the onboarding cookie is absent, or by URL.
 * It never redirects on its own -- a wizard that bounced would be the one
 * screen able to strand a visitor before they saw the product.
 */
export default async function WelcomePage() {
  await connection()
  const db = createServiceClient()

  const [skillsRes, reqsRes, me] = await Promise.all([
    db.from('skills').select('skill'),
    db.from('requirements').select('skill'),
    getDemoProfile(),
  ])

  const inDemand = [...new Set(((reqsRes.data ?? []) as { skill: string }[]).map((r) => r.skill))]
  const held = [...new Set(((skillsRes.data ?? []) as { skill: string }[]).map((s) => s.skill))]
  const vocabulary = [...inDemand, ...held.filter((s) => !inDemand.includes(s))]

  return <GuildWizard skillVocabulary={vocabulary} meName={me?.name ?? null} />
}
