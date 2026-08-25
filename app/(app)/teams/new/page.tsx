import Link from 'next/link'
import { Handshake, Lightbulb, Trophy } from '@phosphor-icons/react/dist/ssr'
import { Page, PageHeader } from '@/components/shell/page-header'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { DataRow } from '@/components/ui/bits'

/**
 * Posting a request is not built yet, and a primary button that 404s is worse
 * than one that tells the truth. This states plainly what the flow will be and
 * sends people to the two surfaces that already work, rather than pretending.
 */
export default function NewSquadPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Team Board"
        title="Post a request"
        subtitle="Describe what a project needs, and Guild ranks every person in the pool by what they would add to it."
      />

      <Card className="mt-6 max-w-2xl p-6">
        <p className="text-[15px] text-ink-2">
          Creating a squad from the browser is not built yet. The seeded squads
          on the Team Board were written directly into the database by{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13.5px]">
            seed/seed-demo.mjs
          </code>
          , and the scoring model treats them exactly as it would treat one you
          posted here.
        </p>

        <p className="mt-4 text-[15px] text-ink-2">When it lands, a request is three things:</p>

        <div className="mt-4 space-y-2">
          <DataRow
            tone="lilac"
            icon={<Trophy />}
            label="What it is for"
            value="A hackathon from the corpus, or a research project, startup or side project"
          />
          <DataRow
            tone="mint"
            icon={<Handshake />}
            label="What it needs"
            value="Weighted requirements — a skill, a minimum proficiency, and how much it matters"
          />
          <DataRow
            tone="peach"
            icon={<Lightbulb />}
            label="What happens next"
            value="Everyone in the pool is ranked by marginal gain against those requirements"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/teams" className={buttonVariants({ variant: 'primary' })}>
            Back to the Team Board
          </Link>
          <Link href="/hackathons" className={buttonVariants({ variant: 'secondary' })}>
            Browse hackathons
          </Link>
        </div>
      </Card>
    </Page>
  )
}
