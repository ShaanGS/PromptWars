import type { Connector } from './types'
import { allEventsConnector } from './allevents'
import { makeBevyConnector } from './bevy'
import { devfolioConnector } from './devfolio'
import { devpostConnector } from './devpost'
import { eventbriteConnector } from './eventbrite'
import { knowafestConnector } from './knowafest'
import { lumaConnector } from './luma'
import { unstopConnector } from './unstop'

/**
 * Connector registry. Adding source #11 should be one new file plus one line
 * here -- nothing else in the pipeline changes.
 */
// The three Bevy communities share one implementation (see bevy.ts).
const gdgConnector = makeBevyConnector(
  'gdg',
  'https://gdg.community.dev/gdg-chennai/',
  'GDG Chennai',
)
const figmaConnector = makeBevyConnector(
  'figma',
  'https://friends.figma.com/chennai/',
  'Friends of Figma Chennai',
)
const mulesoftConnector = makeBevyConnector(
  'mulesoft',
  'https://meetups.mulesoft.com/chennai/',
  'MuleSoft Meetups Chennai',
)

export const CONNECTORS: Record<string, Connector> = {
  [allEventsConnector.id]: allEventsConnector,
  [gdgConnector.id]: gdgConnector,
  [figmaConnector.id]: figmaConnector,
  [mulesoftConnector.id]: mulesoftConnector,
  [devfolioConnector.id]: devfolioConnector,
  [devpostConnector.id]: devpostConnector,
  [eventbriteConnector.id]: eventbriteConnector,
  [knowafestConnector.id]: knowafestConnector,
  [lumaConnector.id]: lumaConnector,
  [unstopConnector.id]: unstopConnector,
}

export function getConnector(id: string): Connector {
  const connector = CONNECTORS[id]
  if (!connector) {
    throw new Error(
      `Unknown connector "${id}". Known: ${Object.keys(CONNECTORS).join(', ') || '(none)'}`,
    )
  }
  return connector
}

export function listConnectorIds(): string[] {
  return Object.keys(CONNECTORS)
}
