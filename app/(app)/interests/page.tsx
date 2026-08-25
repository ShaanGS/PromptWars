import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/server'
import { getInterests } from '@/lib/interests'
import { Page, PageHeader } from '@/components/shell/page-header'
import { InterestsEditor } from '@/components/onboarding/editor'

export default async function InterestsPage() {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const existing = await getInterests(user.id)

  return (
    <Page>
      <PageHeader
        title="Interests"
        subtitle="What the feed ranks up for you. Change it whenever your week changes."
      />
      <div className="mt-6 max-w-[720px]">
        <InterestsEditor initialTags={existing?.tags ?? []} initialPrefs={existing?.prefs ?? {}} />
      </div>
    </Page>
  )
}
