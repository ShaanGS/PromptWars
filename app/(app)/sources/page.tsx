import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Plugs, Rocket } from '@phosphor-icons/react/dist/ssr'
import { getSessionUser } from '@/lib/auth/server'
import { listSources } from '@/lib/queries'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Card, SectionHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/bits'
import { SourceRow } from '@/components/sources/source-row'

/**
 * /sources -- where the events come from, and the one control you have
 * over it: mute. Health is global (did the scraper run, did it find
 * anything); a mute is yours alone and touches nothing you saved.
 */
export default async function SourcesPage() {
  await connection()
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const sources = await listSources(user.id)
  const live = sources.filter((s) => s.enabled)
  const pending = sources.filter((s) => !s.enabled)
  const mutedCount = live.filter((s) => s.muted).length

  return (
    <Page>
      <PageHeader
        title="Sources"
        subtitle={`${live.length} live${mutedCount ? `, ${mutedCount} muted by you` : ''}${
          pending.length ? ` · ${pending.length} not wired yet` : ''
        }. Ingest runs daily at 7am IST.`}
      />

      <section className="mt-6">
        <SectionHeading
          icon={<Plugs weight="duotone" />}
          title="Live"
          aside="mute hides one from your lists only"
        />
        {live.length ? (
          <ul className="grid gap-2.5">
            {live.map((s) => (
              <li key={s.id}>
                <SourceRow source={s} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No live sources" body="Nothing is enabled. The seed decides that." />
        )}
      </section>

      {pending.length ? (
        <section className="mt-8">
          <SectionHeading
            icon={<Rocket weight="duotone" />}
            title="Not live yet"
            aside="built or planned, switched off"
          />
          <ul className="grid gap-2.5">
            {pending.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center gap-3 opacity-80">
                  <span
                    className="size-2.5 shrink-0 rounded-full border border-line-strong bg-surface"
                    aria-hidden="true"
                  />
                  <p className="flex-1 text-[15.5px] font-medium text-ink-2">{s.display_name}</p>
                  <span className="text-[13px] text-ink-3">built, switched off</span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  )
}
