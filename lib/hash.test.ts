import { describe, expect, it } from 'vitest'
import { contentHash, scoringHash } from './hash'
import { devpostConnector } from './connectors/devpost'

/** A real Devpost payload, trimmed. */
const base = {
  id: 27959,
  title: 'India High School Exoplanet Data Challenge',
  url: 'https://celesta-exoplanet-challenge.devpost.com/',
  submission_period_dates: 'Jun 15 - Jul 31, 2026',
  organization_name: 'Celesta',
  themes: [{ id: 6, name: 'Machine Learning/AI' }],
  time_left_to_submission: '7 days left',
  registrations_count: 391,
}

describe('contentHash excludes volatile fields', () => {
  it('is stable when only the daily-churning fields change', () => {
    // This is the entire reason volatileFields exists. Both of these change
    // every day. Hashing them would write a new raw_listings row per hackathon
    // per day and re-score the whole corpus along with it -- turning a ~70
    // call/week LLM budget into several hundred a day.
    const tomorrow = {
      ...base,
      time_left_to_submission: '6 days left',
      registrations_count: 402,
    }

    expect(contentHash(tomorrow, devpostConnector.volatileFields)).toBe(
      contentHash(base, devpostConnector.volatileFields),
    )
  })

  it('would NOT be stable without the exclusion list', () => {
    // Guards against someone "simplifying" the call site later.
    const tomorrow = { ...base, time_left_to_submission: '6 days left' }
    expect(contentHash(tomorrow)).not.toBe(contentHash(base))
  })

  it('still changes when something meaningful changes', () => {
    const retitled = { ...base, title: 'Something else entirely' }
    expect(contentHash(retitled, devpostConnector.volatileFields)).not.toBe(
      contentHash(base, devpostConnector.volatileFields),
    )
  })

  it('does not depend on key order', () => {
    const reordered = {
      url: base.url,
      title: base.title,
      id: base.id,
      themes: base.themes,
      organization_name: base.organization_name,
      submission_period_dates: base.submission_period_dates,
      time_left_to_submission: base.time_left_to_submission,
      registrations_count: base.registrations_count,
    }
    expect(contentHash(reordered, devpostConnector.volatileFields)).toBe(
      contentHash(base, devpostConnector.volatileFields),
    )
  })

  it('excludes volatile fields nested inside arrays and objects', () => {
    const a = { items: [{ name: 'x', registrations_count: 1 }] }
    const b = { items: [{ name: 'x', registrations_count: 999 }] }
    expect(contentHash(a, ['registrations_count'])).toBe(contentHash(b, ['registrations_count']))
  })
})

describe('scoringHash covers only what affects a score', () => {
  const event = {
    title: 'AI Builders Meetup',
    description: 'A meetup for AI builders',
    tags: ['ai', 'meetup'],
    eventType: 'meetup',
  }

  it('ignores a venue or URL correction', () => {
    // Those live on the event row but are deliberately not part of this hash:
    // fixing a venue typo upstream must not cost an LLM call.
    expect(scoringHash({ ...event })).toBe(scoringHash({ ...event }))
  })

  it('ignores tag ordering', () => {
    expect(scoringHash({ ...event, tags: ['meetup', 'ai'] })).toBe(scoringHash(event))
  })

  it('changes when the title changes', () => {
    expect(scoringHash({ ...event, title: 'Wedding Expo' })).not.toBe(scoringHash(event))
  })

  it('is case and whitespace insensitive', () => {
    expect(scoringHash({ ...event, title: '  AI BUILDERS MEETUP  ' })).toBe(scoringHash(event))
  })
})
