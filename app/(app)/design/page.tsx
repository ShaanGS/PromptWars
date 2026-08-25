import { connection } from 'next/server'
import {
  BookmarkSimple,
  CalendarBlank,
  Clock,
  MagnifyingGlass,
  MapPin,
  Plus,
  Ticket,
} from '@phosphor-icons/react/dist/ssr'
import { requireAdmin } from '@/lib/auth/server'
import { BrandMark, Wordmark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Pill, CATEGORY_TONES } from '@/components/ui/pill'
import { Card, CardMeta, CardTitle, SectionHeading } from '@/components/ui/card'
import { Field, FormNote, IconInput, Input } from '@/components/ui/field'
import {
  Avatar,
  DataRow,
  Divider,
  EmptyState,
  Skeleton,
  StatTile,
  toneClass,
} from '@/components/ui/bits'
import { Chip, ChipRow } from '@/components/ui/chip'
import { DesignInteractive } from './interactive'

/**
 * /design -- every primitive, every state, on one page.
 *
 * Admin-gated rather than dev-only so the system can be reviewed on a real
 * phone against the live deployment before any screen adopts it.
 */
export default async function DesignPage() {
  await connection()
  await requireAdmin()

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <header>
        <p className="text-[12.5px] font-medium text-ink-2">Design system</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
          Olvable primitives
        </h1>
        <p className="mt-2 max-w-prose text-[15px] text-ink-2">
          Every token and primitive the screens are built from. Review on a phone and on a laptop;
          what is wrong here is wrong everywhere.
        </p>
      </header>

      <Section title="Brand">
        <div className="flex flex-wrap items-center gap-8">
          <Wordmark size="lg" tagline />
          <Wordmark />
          <Wordmark size="sm" />
          <div className="flex items-center gap-3 rounded-card bg-ink p-4">
            <Wordmark onDark />
          </div>
          <div className="flex items-center gap-3">
            <BrandMark size={48} />
            <BrandMark size={32} />
            <BrandMark size={20} />
            <BrandMark size={16} />
          </div>
        </div>
      </Section>

      <Section title="Colour">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ['canvas', 'bg-canvas border border-line'],
            ['surface', 'bg-surface border border-line'],
            ['surface-2', 'bg-surface-2'],
            ['ink', 'bg-ink'],
            ['ink-2', 'bg-ink-2'],
            ['accent', 'bg-accent'],
          ].map(([name, cls]) => (
            <div key={name}>
              <div className={`h-12 rounded-ctl ${cls}`} />
              <p className="mt-1.5 text-[12px] text-ink-2">{name}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CATEGORY_TONES.map((t) => (
            <div key={t}>
              <div className={`flex h-12 items-end rounded-ctl px-2.5 pb-2 ${toneClass(t)}`}>
                <span className="text-[12px] font-medium">Aa</span>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-2">{t}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <p className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
          Good evening, Shaan <span className="text-ink-3">32–36 / 600</span>
        </p>
        <p className="mt-3 text-[22px] font-semibold tracking-[-0.01em]">
          Section heading <span className="text-ink-3">22 / 600</span>
        </p>
        <p className="mt-3 text-[16.5px] font-semibold tracking-[-0.01em]">
          Card title <span className="text-ink-3">16.5 / 600</span>
        </p>
        <p className="mt-3 text-[15px]">
          Body text at 15 / 400. Chennai Design Meetup happens at Anna Nagar this Saturday evening,
          doors at six, free to attend.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-2">
          Meta and supporting text, 13.5 / 400, ink-2.
        </p>
        <p className="mt-3 text-[12.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
          Label · 12.5 / 500 · tracking 0.06em
        </p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="accent">
            <Plus weight="bold" /> Going
          </Button>
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Revoke</Button>
          <Button variant="danger-solid">Yes, revoke</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Search">
            <MagnifyingGlass weight="bold" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Save">
            <BookmarkSimple weight="bold" />
          </Button>
          <Button pill variant="primary" size="sm">
            Pill button
          </Button>
        </div>
      </Section>

      <Section title="Pills and chips">
        <div className="flex flex-wrap gap-2">
          <Pill tone="accent">Going</Pill>
          <Pill tone="accent-soft">Interested</Pill>
          <Pill tone="success">Live</Pill>
          <Pill tone="warning">Closing soon</Pill>
          <Pill tone="danger">Revoked</Pill>
          <Pill>Neutral</Pill>
          <Pill tone="outline">Outline</Pill>
          <Pill tone="ink">NEW</Pill>
          {CATEGORY_TONES.map((t) => (
            <Pill key={t} tone={t}>
              {t}
            </Pill>
          ))}
          <Pill size="sm" tone="lilac">
            small
          </Pill>
        </div>
        <ChipRow className="mt-4">
          <Chip active>All</Chip>
          <Chip>
            <CalendarBlank weight="bold" /> This week
          </Chip>
          <Chip>
            <MapPin weight="bold" /> Offline
          </Chip>
          <Chip>Free</Chip>
          <Chip>Design</Chip>
          <Chip>Tech</Chip>
          <Chip>Music</Chip>
          <Chip>Startups</Chip>
        </ChipRow>
      </Section>

      <Section title="Forms">
        <div className="grid gap-4 sm:max-w-sm">
          <Field
            label="Email"
            htmlFor="d-email"
            hint="We never send mail. Your admin hands you the password."
          >
            <Input id="d-email" type="email" autoComplete="off" placeholder="you@example.com" />
          </Field>
          <Field label="Search" htmlFor="d-search">
            <IconInput
              id="d-search"
              icon={<MagnifyingGlass weight="bold" />}
              placeholder="Search events"
            />
          </Field>
          <Field label="Password" htmlFor="d-pw" optional error="Use at least 8 characters.">
            <Input
              id="d-pw"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </Field>
          <FormNote tone="ok">Password updated.</FormNote>
          <FormNote tone="err">Wrong email or password.</FormNote>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card padded={false} interactive>
            <div className="relative flex h-36 items-end rounded-t-card bg-sky p-3">
              <Pill tone="ink" size="sm">
                NEW
              </Pill>
              <span className="ml-auto rounded-full bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink">
                Sat 30 Aug · 6 pm
              </span>
            </div>
            <div className="p-4">
              <CardTitle>Chennai Design Meetup — Vol. 12</CardTitle>
              <CardMeta className="mt-1">Anna Nagar · Free · Luma</CardMeta>
              <div className="mt-3 flex items-center gap-1.5">
                <Pill tone="lilac" size="sm">
                  Design
                </Pill>
                <Pill tone="mint" size="sm">
                  Offline
                </Pill>
                <Pill tone="accent" size="sm" className="ml-auto">
                  Going
                </Pill>
              </div>
            </div>
          </Card>
          <Card>
            <CardTitle>Plain card</CardTitle>
            <CardMeta className="mt-1">Padded, hairline border, 16px radius.</CardMeta>
            <div className="mt-4 grid gap-2">
              <DataRow
                icon={<CalendarBlank weight="duotone" />}
                label="When"
                value="Sat 30 Aug, 6:00 pm"
                tone="sky"
              />
              <DataRow
                icon={<MapPin weight="duotone" />}
                label="Where"
                value="Anna Nagar, Chennai"
                tone="mint"
              />
              <DataRow icon={<Ticket weight="duotone" />} label="Entry" value="Free" />
            </div>
          </Card>
          <Card>
            <CardTitle>Loading</CardTitle>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full rounded-card" />
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Stat tiles">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile label="Upcoming" value={128} hint="in scope" tone="lilac" />
          <StatTile label="Top picks" value={14} hint="scored 80+" tone="sky" />
          <StatTile label="Closing soon" value={3} hint="within 7 days" tone="lemon" />
          <StatTile label="Sources" value="2/2" hint="healthy" />
        </div>
      </Section>

      <Section title="People">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Shaan Gurushankar" size={44} />
          <Avatar name="shaanvishy@gmail.com" />
          <Avatar name="Antonio Larentio" size={28} tone="rose" />
          <div className="flex -space-x-2">
            <Avatar name="A B" size={28} className="ring-2 ring-surface" />
            <Avatar name="C D" size={28} className="ring-2 ring-surface" />
            <Avatar name="E F" size={28} className="ring-2 ring-surface" />
          </div>
        </div>
      </Section>

      <Section title="Interactive">
        <DesignInteractive />
      </Section>

      <Section title="Empty">
        <EmptyState
          icon={<BookmarkSimple weight="duotone" />}
          title="Nothing saved yet"
          body="Tap the bookmark on any event to keep it here."
          action={<Button variant="primary">Browse events</Button>}
        />
      </Section>

      <Section title="Calendar blocks (preview)">
        <div className="max-w-md space-y-1.5">
          {[
            {
              t: '10 am',
              title: 'GDG Chennai · Flutter Forward',
              meta: '10:00 – 13:00 · Taramani',
              cls: 'bg-lilac text-lilac-ink',
            },
            {
              t: '4 pm',
              title: 'Startup Saturday',
              meta: '16:00 – 18:00 · Online',
              cls: 'bg-mint text-mint-ink',
            },
            {
              t: '7 pm',
              title: 'Design Meetup Vol. 12',
              meta: '18:00 – 20:00 · Going',
              cls: 'bg-accent text-white',
            },
          ].map((b) => (
            <div key={b.title} className="flex gap-2.5">
              <span className="w-10 shrink-0 pt-2 text-[11.5px] text-ink-3">{b.t}</span>
              <div className={`flex-1 rounded-ctl px-3 py-2 ${b.cls}`}>
                <p className="text-[13px] font-medium">{b.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] opacity-80">
                  <Clock size={12} weight="bold" /> {b.meta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <SectionHeading title={title} />
      <Divider className="mb-5" />
      {children}
    </section>
  )
}
