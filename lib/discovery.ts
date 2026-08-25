import { COVERED_DOMAINS } from '@/config/discovery'

/**
 * Pure lead-shaping for the discovery sweep: what a CSE result item must
 * survive to become a lead worth a human's glance. Kept out of the script
 * so the rules are testable.
 */

export interface CseItem {
  title?: string
  link?: string
  snippet?: string
}

export interface Lead {
  query: string
  title: string
  url: string
  snippet: string | null
  domain: string
}

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function toLeads(query: string, items: CseItem[]): Lead[] {
  const leads: Lead[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.link || !item.title) continue
    const domain = domainOf(item.link)
    if (!domain) continue
    // A hit on a domain a connector already sweeps is not a discovery.
    if (COVERED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) continue
    if (seen.has(item.link)) continue
    seen.add(item.link)
    leads.push({
      query,
      title: item.title.slice(0, 300),
      url: item.link,
      snippet: item.snippet?.slice(0, 500) ?? null,
      domain,
    })
  }
  return leads
}
