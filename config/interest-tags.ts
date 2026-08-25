/**
 * The interest taxonomy a member picks from. Twelve, on purpose: enough to
 * separate a founder from a designer from a runner, few enough to fit on one
 * phone screen.
 *
 * `match` is how an event earns the tag: a regex over title + description +
 * source tags + event_type, lower-cased. Keyword matching is deliberately
 * dumb and cheap -- it runs per request over ~60 rows. The LLM already did
 * the expensive judgement (quality); this is only "is it the kind of thing
 * they said they like".
 */
export type InterestTag = {
  id: string
  label: string
  blurb: string
  tone: 'sky' | 'mint' | 'lemon' | 'rose' | 'lilac' | 'peach'
  match: RegExp
}

export const INTEREST_TAGS: InterestTag[] = [
  {
    id: 'startups',
    label: 'Startups',
    blurb: 'founders, pitches, demo days',
    tone: 'lilac',
    match: /startup|founder|entrepreneur|pitch|demo day|incubat|accelerat|venture|vc\b|angel/,
  },
  {
    id: 'tech',
    label: 'Tech',
    blurb: 'dev, AI, data, cloud',
    tone: 'sky',
    match:
      /\btech|developer|\bdev\b|software|\bai\b|machine learning|\bml\b|llm|data|cloud|devops|open source|web3|blockchain|cyber|robot|iot/,
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    blurb: 'build something in a weekend',
    tone: 'rose',
    match: /hackathon|hack\b|buildathon|ideathon|codeathon|24[- ]hour/,
  },
  {
    id: 'design',
    label: 'Design',
    blurb: 'UX, product, visual',
    tone: 'peach',
    match: /design|\bux\b|\bui\b|figma|product manag|typograph|illustrat/,
  },
  {
    id: 'investing',
    label: 'Investing & finance',
    blurb: 'markets, funding, money',
    tone: 'mint',
    match: /invest|finance|financial|fintech|trading|stock|wealth|fund(?:ing|raise)|mutual/,
  },
  {
    id: 'networking',
    label: 'Networking',
    blurb: 'meet people, mixers, meetups',
    tone: 'lemon',
    match: /network|meetup|mixer|community|connect|coffee|breakfast|\bclub\b/,
  },
  {
    id: 'talks',
    label: 'Talks & conferences',
    blurb: 'summits, panels, keynotes',
    tone: 'sky',
    match: /conference|summit|conclave|panel|keynote|talk|ted ?x|symposium|forum|expo/,
  },
  {
    id: 'workshops',
    label: 'Workshops',
    blurb: 'hands-on, learn a skill',
    tone: 'lilac',
    match: /workshop|masterclass|bootcamp|training|course|class\b|hands-on|tutorial/,
  },
  {
    id: 'music',
    label: 'Music & nightlife',
    blurb: 'gigs, concerts, DJ nights',
    tone: 'rose',
    match: /music|concert|gig|\bdj\b|live band|festival|party|night/,
  },
  {
    id: 'arts',
    label: 'Arts & culture',
    blurb: 'theatre, exhibitions, film',
    tone: 'peach',
    match: /\bart\b|arts|theatre|theater|exhibit|gallery|film|cinema|dance|poetry|literature|book/,
  },
  {
    id: 'sports',
    label: 'Sports & fitness',
    blurb: 'runs, matches, yoga',
    tone: 'mint',
    match:
      /marathon|\brun\b|running|cycling|yoga|fitness|cricket|football|badminton|sport|trek|hike/,
  },
  {
    id: 'food',
    label: 'Food & drink',
    blurb: 'tastings, pop-ups, brunches',
    tone: 'lemon',
    match: /food|brunch|dinner|tasting|culinary|chef|coffee|wine|beer|bake/,
  },
]

export const INTEREST_BY_ID: Record<string, InterestTag> = Object.fromEntries(
  INTEREST_TAGS.map((t) => [t.id, t]),
)

/** Where / when preferences from onboarding step 2. All optional. */
export type InterestPrefs = {
  /** 'chennai' | 'tn' -- how far they will travel. */
  area?: 'chennai' | 'tn'
  /** 'inperson' | 'online' | 'both' */
  mode?: 'inperson' | 'online' | 'both'
  /** 'weekdays' | 'weekends' | 'both' */
  days?: 'weekdays' | 'weekends' | 'both'
}

export const PREF_OPTIONS = {
  area: [
    { value: 'chennai', label: 'Chennai only' },
    { value: 'tn', label: 'All of Tamil Nadu' },
  ],
  mode: [
    { value: 'inperson', label: 'In person' },
    { value: 'online', label: 'Online' },
    { value: 'both', label: 'Both' },
  ],
  days: [
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekends', label: 'Weekends' },
    { value: 'both', label: 'Any day' },
  ],
} as const
