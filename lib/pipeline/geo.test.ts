import { describe, expect, it } from 'vitest'
import { classifyGeo } from './geo'

describe('classifyGeo keeps by default', () => {
  it('keeps online events', () => {
    expect(classifyGeo({ isOnline: true })).toBe('active')
    expect(classifyGeo({ venue: 'Online' })).toBe('active')
  })

  it.each([
    'Chennai',
    'IIT Madras, Chennai',
    'Coimbatore, Tamil Nadu',
    'Vellore Institute',
    'Madurai',
  ])('keeps in-scope location %o', (venue) => {
    expect(classifyGeo({ venue })).toBe('active')
  })

  it.each([
    'Jaipur, India',
    'VITM, Indore',
    'Thoughtwork Technology, Gurugram',
    'Kristu Jayanti, Bengaluru',
    'Hotel shree palace, Ujjain',
    'Singapore',
    'Marina Bay, Singapore',
  ])('filters positively out-of-scope location %o', (venue) => {
    expect(classifyGeo({ venue })).toBe('filtered_geo')
  })

  // These are the regression cases. The first live Devpost run filtered all
  // four, because the old rule discarded anything it could not confirm as
  // local -- and a venue string frequently carries no geographic signal at all.
  it.each(['Freshworks', 'Auditorium', 'KIT main building', 'Main Hall'])(
    'keeps %o rather than guessing it is elsewhere',
    (venue) => {
      expect(classifyGeo({ venue })).toBe('active')
    },
  )

  it.each([
    ['US', 'Boston'],
    ['DE', 'STARTPLATZ Düsseldorf GmbH'],
    ['United States', 'Clay in Boston: Reboot'],
  ])('filters structured country %s regardless of venue text', (country, venue) => {
    // No keyword list can enumerate every foreign city -- 'Clay in Boston'
    // sat in the feed because Boston is not on an Indian out-of-scope list.
    // A structured country is definitive.
    expect(classifyGeo({ country, venue })).toBe('filtered_geo')
  })

  it('keeps a structured India country', () => {
    expect(classifyGeo({ country: 'IN', venue: 'Hotel shree palace' })).toBe('active')
    expect(classifyGeo({ country: 'India', venue: 'somewhere' })).toBe('active')
  })

  it('keeps an event with no location information', () => {
    expect(classifyGeo({})).toBe('active')
    expect(classifyGeo({ venue: null, city: null })).toBe('active')
  })

  it('prefers an in-scope match over an out-of-scope one in the same string', () => {
    // "Chennai team travelling to the Bangalore finals" should stay.
    expect(classifyGeo({ venue: 'Chennai', description: 'finals in Bengaluru' })).toBe('active')
  })
})

describe('classifyGeo with requireLocal (national sources)', () => {
  it('keeps an online listing regardless of where the organiser is', () => {
    expect(
      classifyGeo(
        { isOnline: true, venue: 'Online', title: 'Agentic AI Hackathon' },
        { requireLocal: true },
      ),
    ).toBe('active')
  })

  it('keeps an in-person listing that names a Tamil Nadu place', () => {
    expect(
      classifyGeo(
        { venue: 'Chennai Institute of Technology', title: 'Innovest 3.0' },
        { requireLocal: true },
      ),
    ).toBe('active')
    expect(
      classifyGeo(
        { venue: 'AAA College of Engineering and Technology (AAACET), Sivakasi, Tamil Nadu' },
        { requireLocal: true },
      ),
    ).toBe('active')
  })

  it('keeps a local anchor with no place name in it', () => {
    expect(classifyGeo({ venue: 'Freshworks' }, { requireLocal: true })).toBe('active')
  })

  it('filters an in-person listing with no local signal, which the default would keep', () => {
    const unrecognised = { venue: 'SIEC Community', title: 'DropHack' }
    expect(classifyGeo(unrecognised)).toBe('active')
    expect(classifyGeo(unrecognised, { requireLocal: true })).toBe('filtered_geo')
  })

  it('filters an out-of-state campus the default keeps for want of a keyword', () => {
    // "Kharagpur" is on no list -- OUT_OF_SCOPE has Kolkata and West Bengal,
    // not every campus town in them. Under the default that is deliberate;
    // for a national source it is exactly the hole requireLocal closes.
    const kgp = { venue: 'Indian Institute of Technology (IIT), Kharagpur' }
    expect(classifyGeo(kgp)).toBe('active')
    expect(classifyGeo(kgp, { requireLocal: true })).toBe('filtered_geo')
  })

  it('filters a named out-of-state city under both rules', () => {
    const blr = { venue: 'Christ University, Bengaluru' }
    expect(classifyGeo(blr)).toBe('filtered_geo')
    expect(classifyGeo(blr, { requireLocal: true })).toBe('filtered_geo')
  })

  it('filters an in-person listing with no venue at all', () => {
    expect(classifyGeo({}, { requireLocal: true })).toBe('filtered_geo')
    expect(classifyGeo({})).toBe('active')
  })
})

describe('requireLocal ignores the description', () => {
  const kgp = {
    venue: 'Indian Institute of Technology (IIT), Kharagpur',
    title: 'OptimizeIT',
    description: 'Register online. Open to students across India.',
  }

  it('does not let "online" in the prose make an in-person listing pass', () => {
    // The default rule reads the description and keeps it; that is fine for a
    // Chennai listing site and wrong for a national one.
    expect(classifyGeo(kgp)).toBe('active')
    expect(classifyGeo(kgp, { requireLocal: true })).toBe('filtered_geo')
  })

  it('does not let a mention of Chennai in the prose make it local', () => {
    const delhi = {
      venue: 'Institute of Information Technology and Management, Janakpuri',
      title: 'Data Dive',
      description: 'Teams from Chennai, Mumbai and Delhi are welcome.',
    }
    expect(classifyGeo(delhi, { requireLocal: true })).toBe('filtered_geo')
  })
})

describe('requireLocal reads "online" only where a place is stated', () => {
  it('does not treat a title containing "Online" as an online event', () => {
    const noida = {
      venue: 'Noida Institute of Engineering And Technology (NIET), Greater Noida',
      title: 'Segue 3.0 : Global Design Thinking Challenge (Online + Offline)',
    }
    expect(classifyGeo(noida, { requireLocal: true })).toBe('filtered_geo')
  })

  it('still keeps one whose venue says Online', () => {
    expect(
      classifyGeo({ venue: 'Online', title: 'Agentic AI Hackathon' }, { requireLocal: true }),
    ).toBe('active')
  })
})
