import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { roleOf } from '@/lib/auth/roles'
import { createServiceClient } from '@/lib/supabase'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { EmptyState } from '@/components/ui/bits'
import { buttonVariants } from '@/components/ui/button'
import { dismissLead, useLead } from './actions'

/**
 * /admin/discovery — the weekly sweep's lead queue.
 *
 * Leads, not events: everything here is a search snippet awaiting a human.
 * "Draft event" hands the text to /admin/add prefilled; Dismiss keeps the
 * row (nothing silently deleted) and the URL index stops it ever returning.
 */
export default async function DiscoveryPage() {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (roleOf(user) !== 'admin') redirect('/')

  const db = createServiceClient()
  const { data: leads } = await db
    .from('discovery_leads')
    .select('id, found_at, query, title, url, snippet, domain')
    .eq('status', 'new')
    .order('found_at', { ascending: false })
    .limit(100)

  const rows = leads ?? []

  return (
    <Page>
      <PageHeader
        title="Discovery leads"
        subtitle="What the weekly sweep found beyond the connectors. Each one is a snippet, not a fact — draft it, then check every field."
      />

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No new leads"
          body="The sweep runs Monday 8am IST, or on demand from GitHub Actions."
        />
      ) : (
        <div className="mt-6 grid max-w-[760px] gap-3">
          {rows.map((lead) => (
            <Card key={lead.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[15.5px] font-semibold leading-snug text-ink underline-offset-2 hover:underline"
                  >
                    {lead.title}
                    <ArrowUpRight size={14} weight="bold" className="ml-1 inline text-ink-3" />
                  </a>
                  {lead.snippet ? (
                    <p className="mt-1.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-2">
                      {lead.snippet}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone="outline" size="sm">
                      {lead.domain}
                    </Pill>
                    <span className="text-[12.5px] text-ink-3">via “{lead.query}”</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <form action={useLead.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className={buttonVariants({ size: 'sm', variant: 'primary' })}
                  >
                    Draft event
                  </button>
                </form>
                <form action={dismissLead.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                  >
                    Dismiss
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}
