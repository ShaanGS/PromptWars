import { connection } from 'next/server'
import { ClockCounterClockwise, Users } from '@phosphor-icons/react/dist/ssr'
import { requireAdmin } from '@/lib/auth/server'
import { listAccounts, listAudit } from '@/lib/admin/users'
import { Page, PageHeader } from '@/components/shell/page-header'
import { SectionHeading } from '@/components/ui/card'
import { AccountList } from '@/components/admin/account-list'
import { CreateAccountForm } from '@/components/admin/create-account-form'
import { AuditLog } from '@/components/admin/audit-log'

/**
 * /admin -- who has access.
 *
 * The gate is requireAdmin(), server-side, on every render and in every
 * action. The sidebar hiding the link for members is decoration. The
 * middleware bouncing members away is a second net. Neither is the gate.
 */
export default async function AdminPage() {
  await connection()
  const admin = await requireAdmin()

  const [accounts, audit] = await Promise.all([listAccounts(), listAudit(40)])
  const members = accounts.filter((a) => a.role === 'member')
  const active = members.filter((a) => !a.revoked).length
  const revoked = members.length - active

  return (
    <Page>
      <PageHeader
        title="Access"
        subtitle={`${active === 1 ? '1 person has' : `${active} people have`} access besides you${
          revoked ? `, ${revoked} revoked` : ''
        }. Only you can change that.`}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <SectionHeading
            icon={<Users weight="duotone" />}
            title="People"
            aside={`${accounts.length} accounts`}
          />
          <AccountList accounts={accounts} selfId={admin.id} />
        </div>

        <aside className="min-w-0 self-start lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <CreateAccountForm />
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <SectionHeading
            icon={<ClockCounterClockwise weight="duotone" />}
            title="Recent activity"
          />
          <AuditLog rows={audit} />
        </div>
      </div>
    </Page>
  )
}
