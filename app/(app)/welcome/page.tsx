import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/server'
import { isOnboarded } from '@/lib/auth/roles'
import { getInterests, getSeedEvents } from '@/lib/interests'
import { OnboardingWizard } from '@/components/onboarding/wizard'

/**
 * /welcome -- onboarding. Full-screen over the shell; three steps; one save.
 * Already-onboarded users are sent to the feed (edit at /interests).
 */
export default async function WelcomePage() {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (isOnboarded(user)) redirect('/interests')

  const [seedEvents, existing] = await Promise.all([getSeedEvents(6), getInterests(user.id)])

  return (
    <OnboardingWizard
      seedEvents={seedEvents}
      initialTags={existing?.tags ?? []}
      initialPrefs={existing?.prefs ?? {}}
    />
  )
}
