import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/server'
import { roleOf } from '@/lib/auth/roles'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { AddEventForm } from '@/components/add-event-form'

/**
 * /admin/add -- hand-pick an event into the feed.
 *
 * The middleware already bounces non-admins off /admin/*; the check here is
 * the belt to that suspender, same as /admin itself.
 */
export default async function AddEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (roleOf(user) !== 'admin') redirect('/')
  const params = await searchParams
  // A discovery lead arrives with its text in the URL, ready to draft.
  const initialText = typeof params.text === 'string' ? params.text.slice(0, 4000) : ''

  return (
    <Page>
      <PageHeader
        title="Add an event"
        subtitle="Paste a post, check the draft, and it joins the feed as hand-picked."
      />
      <Card className="mt-6 max-w-[640px]">
        <AddEventForm initialText={initialText} />
      </Card>
    </Page>
  )
}
