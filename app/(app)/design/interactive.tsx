'use client'

import { useState } from 'react'
import { CalendarBlank, MapPin } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DataRow } from '@/components/ui/bits'
import { Pill } from '@/components/ui/pill'

/** The stateful primitives, rendered client-side. */
export function DesignInteractive() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Segmented
        aria-label="Calendar view"
        value={view}
        onChange={setView}
        options={[
          { value: 'month', label: 'Month' },
          { value: 'week', label: 'Week' },
          { value: 'day', label: 'Day' },
        ]}
      />
      <Segmented
        size="sm"
        value="all"
        options={[
          { value: 'all', label: 'All' },
          { value: 'saved', label: 'Saved' },
        ]}
      />
      <Sheet>
        <SheetTrigger render={<Button variant="primary" />}>Open sheet</SheetTrigger>
        <SheetContent
          title="Chennai Design Meetup — Vol. 12"
          description="Sat 30 Aug · 6:00 pm · Anna Nagar"
        >
          <div className="grid gap-2">
            <DataRow
              icon={<CalendarBlank weight="duotone" />}
              label="When"
              value="Saturday 30 August, 6:00 – 8:00 pm"
              tone="sky"
            />
            <DataRow
              icon={<MapPin weight="duotone" />}
              label="Where"
              value="Anna Nagar, Chennai"
              tone="mint"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Pill tone="lilac">Design</Pill>
            <Pill tone="mint">Offline</Pill>
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="accent" className="flex-1">
              Going
            </Button>
            <Button className="flex-1">Interested</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
