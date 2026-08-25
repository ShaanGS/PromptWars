import { describe, expect, it } from 'vitest'
import { toLeads } from './discovery'

const QUERY = '"ITC Grand Chola" (summit OR conference) 2026'

describe('toLeads', () => {
  it('shapes items into leads with a domain', () => {
    const leads = toLeads(QUERY, [
      {
        title: 'AMA CXO & CHRO Summit 2026 — Chennai',
        link: 'https://www.amasouthasia.org/cxo-summit',
        snippet: 'Join us at ITC Grand Chola…',
      },
    ])
    expect(leads).toHaveLength(1)
    expect(leads[0].domain).toBe('amasouthasia.org')
    expect(leads[0].query).toBe(QUERY)
  })

  it('drops domains a connector already covers — a hit there is not a discovery', () => {
    const leads = toLeads(QUERY, [
      { title: 'Some meetup', link: 'https://lu.ma/xyz', snippet: '…' },
      { title: 'Some listing', link: 'https://allevents.in/chennai/x', snippet: '…' },
      { title: 'Real lead', link: 'https://kovaion.com/connect', snippet: '…' },
    ])
    expect(leads.map((l) => l.domain)).toEqual(['kovaion.com'])
  })

  it('drops items missing a link or title, and dedupes within a batch', () => {
    const leads = toLeads(QUERY, [
      { title: 'No link' },
      { link: 'https://example.org/no-title' },
      { title: 'Twice', link: 'https://example.org/e' },
      { title: 'Twice again', link: 'https://example.org/e' },
    ])
    expect(leads).toHaveLength(1)
  })

  it('keeps linkedin post hits — Google indexed them, we never fetched them', () => {
    const leads = toLeads(QUERY, [
      {
        title: 'Kovaion on LinkedIn: Join us at ITC Grand Chola',
        link: 'https://www.linkedin.com/posts/kovaion_connect-activity-123',
        snippet: 'Sept 12, ITC Grand Chola. Register:…',
      },
    ])
    expect(leads).toHaveLength(1)
    expect(leads[0].domain).toBe('linkedin.com')
  })
})
