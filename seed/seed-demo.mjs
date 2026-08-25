// Seeds the demo database over PostgREST: Olvable's event corpus from the
// real ingest run, then Guild's talent pool and the squads forming on top of
// it. Idempotent — every insert upserts on a natural key.
//
//   node seed/seed-demo.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
if (!URL || !KEY) throw new Error('SUPABASE_URL and a key must be set')

async function post(table, rows, onConflict) {
  if (!rows.length) return
  const q = onConflict ? `?on_conflict=${onConflict}` : ''
  const res = await fetch(`${URL}/rest/v1/${table}${q}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32)

// ---------------------------------------------------------------- sources
const SOURCES = [
  ['devfolio', 'Devfolio'],
  ['devpost', 'Devpost'],
  ['unstop', 'Unstop'],
  ['manual', 'Hand-picked'],
]
await post(
  'sources',
  SOURCES.map(([id, display_name]) => ({ id, display_name, enabled: true })),
  'id',
)

// ---------------------------------------------------------------- events
const ingested = JSON.parse(readFileSync('ingest/events.json', 'utf8'))
const events = ingested.map((e, i) => {
  const starts = e.starts_at ? new Date(e.starts_at) : null
  const ends = e.ends_at ? new Date(e.ends_at) : null
  const isDeadline = !starts && !!e.deadline_at
  return {
    source_id: e.source,
    source_uid: `${e.source}-${i}-${hash(e.external_url ?? e.title)}`.slice(0, 80),
    title: e.title,
    title_norm: e.title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    description: null,
    url: e.external_url ?? 'https://example.com',
    canonical_url: e.external_url ?? null,
    image_url: e.image_url ?? null,
    organizer: e.host,
    starts_at_local: starts ? starts.toISOString().slice(0, 19) : null,
    ends_at_local: ends ? ends.toISOString().slice(0, 19) : null,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    registration_deadline: e.deadline_at,
    date_precision: starts ? 'instant' : 'unknown',
    date_kind: isDeadline ? 'deadline' : 'start',
    is_online: e.mode === 'online',
    city: e.mode === 'online' ? null : (e.location ?? 'Chennai'),
    venue: e.location,
    event_type: 'hackathon',
    tags: e.tags?.length ? e.tags : ['hackathon'],
    price_type: 'free',
    content_hash: hash(e.title + (e.external_url ?? '')),
    // A demo needs a spread of bands, not a wall of identical numbers, so the
    // score is derived from the title hash rather than invented per row.
    relevance_score: 60 + (parseInt(hash(e.title).slice(0, 2), 16) % 38),
    relevance_reason: 'Matches hackathon and team-formation interests.',
    status: 'active',
  }
})
const savedEvents = await post('events', events, 'source_id,source_uid')
const eventByTitle = new Map(savedEvents.map((e) => [e.title, e.id]))
console.log(`events: ${savedEvents.length}`)

// ---------------------------------------------------------------- profiles
const AV = {
  A: [
    { day: 2, start: '18:00', end: '21:00' },
    { day: 4, start: '18:00', end: '21:00' },
  ],
  B: [
    { day: 1, start: '18:00', end: '21:00' },
    { day: 3, start: '18:00', end: '21:00' },
  ],
  C: [
    { day: 6, start: '09:00', end: '13:00' },
    { day: 0, start: '09:00', end: '13:00' },
  ],
  D: [2, 3, 4, 5].map((day) => ({ day, start: '21:30', end: '23:30' })),
}
const LOOKING = [
  'Hackathon Team',
  'Research Project',
  'Startup / Idea',
  'Side Project',
  'Collab & Learn',
]

// [handle, name, dept, year, exp, commit, availability, looking, [skill, prof, proved]...]
// React is deliberately over-supplied and figma/pitching deliberately scarce:
// that is what makes the diminishing-returns maths visible in the demo.
const P = [
  [
    'aarav',
    'Aarav Menon',
    'CSE',
    3,
    4,
    5,
    'A',
    0,
    ['machine-learning', 0.7, 1],
    ['backend', 0.4, 0],
  ],
  ['diya', 'Diya Sharma', 'CSE', 3, 3, 5, 'A', 0, ['backend', 0.75, 1], ['devops', 0.5, 0]],
  ['rohan', 'Rohan Iyer', 'CSE', 2, 3, 4, 'A', 0, ['react', 0.85, 1], ['ui-ux', 0.4, 0]],
  ['meera', 'Meera Pillai', 'Design', 3, 4, 4, 'A', 3, ['figma', 0.85, 1], ['ui-ux', 0.8, 1]],
  [
    'kabir',
    'Kabir Bedi',
    'MBA',
    2,
    3,
    4,
    'A',
    2,
    ['pitching', 0.8, 1],
    ['content-writing', 0.6, 0],
  ],
  [
    'ananya',
    'Ananya Rao',
    'AIML',
    4,
    5,
    3,
    'C',
    1,
    ['machine-learning', 0.9, 1],
    ['data-engineering', 0.7, 1],
  ],
  ['vikram', 'Vikram Nair', 'CSE', 3, 3, 4, 'A', 0, ['react', 0.8, 1], ['backend', 0.5, 0]],
  ['ishita', 'Ishita Das', 'IT', 2, 2, 5, 'B', 4, ['react', 0.7, 0], ['flutter', 0.5, 0]],
  ['aditya', 'Aditya Kumar', 'CSE', 2, 2, 4, 'A', 0, ['react', 0.75, 1]],
  ['sneha', 'Sneha Reddy', 'IT', 3, 3, 3, 'B', 3, ['react', 0.7, 1], ['ui-ux', 0.5, 0]],
  ['arjun', 'Arjun Verma', 'CSE', 1, 1, 5, 'D', 4, ['react', 0.55, 0]],
  ['nisha', 'Nisha Patel', 'IT', 2, 2, 4, 'B', 4, ['react', 0.65, 0], ['content-writing', 0.5, 0]],
  ['dev', 'Dev Malhotra', 'CSE', 3, 3, 2, 'D', 3, ['react', 0.8, 1], ['blockchain', 0.6, 0]],
  ['tara', 'Tara Krishnan', 'CSE', 2, 2, 4, 'A', 0, ['react', 0.6, 0], ['figma', 0.45, 0]],
  ['yash', 'Yash Gupta', 'IT', 3, 3, 3, 'B', 3, ['react', 0.7, 0], ['devops', 0.45, 0]],
  ['zoya', 'Zoya Khan', 'CSE', 2, 3, 4, 'A', 0, ['react', 0.75, 1], ['backend', 0.45, 0]],
  ['farhan', 'Farhan Ali', 'ECE', 3, 3, 4, 'B', 3, ['embedded', 0.8, 1], ['backend', 0.4, 0]],
  [
    'priya',
    'Priya Menon',
    'ECE',
    2,
    2,
    3,
    'C',
    4,
    ['embedded', 0.6, 0],
    ['machine-learning', 0.4, 0],
  ],
  ['sanjay', 'Sanjay Rathi', 'CSE', 4, 4, 3, 'B', 2, ['backend', 0.85, 1], ['devops', 0.7, 1]],
  [
    'kavya',
    'Kavya Nambiar',
    'IT',
    3,
    3,
    4,
    'A',
    0,
    ['backend', 0.7, 1],
    ['data-engineering', 0.5, 0],
  ],
  ['rahul', 'Rahul Joshi', 'CSE', 2, 2, 4, 'B', 3, ['backend', 0.6, 0]],
  [
    'anika',
    'Anika Singh',
    'AIML',
    3,
    4,
    4,
    'B',
    1,
    ['machine-learning', 0.75, 1],
    ['data-engineering', 0.6, 1],
  ],
  ['manav', 'Manav Shah', 'AIML', 2, 2, 3, 'D', 4, ['machine-learning', 0.55, 0]],
  [
    'leela',
    'Leela Chandran',
    'Design',
    2,
    2,
    4,
    'B',
    3,
    ['figma', 0.65, 0],
    ['video-editing', 0.6, 1],
  ],
  ['omar', 'Omar Sheikh', 'Mech', 3, 3, 3, 'C', 3, ['unity', 0.7, 1], ['video-editing', 0.5, 0]],
  [
    'ritika',
    'Ritika Bose',
    'Biotech',
    4,
    4,
    4,
    'B',
    1,
    ['data-engineering', 0.7, 1],
    ['content-writing', 0.7, 1],
  ],
  [
    'arnav',
    'Arnav Kapoor',
    'CSE',
    3,
    3,
    3,
    'B',
    0,
    ['cybersecurity', 0.8, 1],
    ['backend', 0.55, 0],
  ],
  [
    'sara',
    'Sara Thomas',
    'IT',
    2,
    2,
    5,
    'A',
    4,
    ['cybersecurity', 0.55, 0],
    ['content-writing', 0.4, 0],
  ],
  ['nikhil', 'Nikhil Menon', 'CSE', 2, 3, 4, 'B', 3, ['flutter', 0.8, 1], ['ui-ux', 0.5, 0]],
  ['pooja', 'Pooja Hegde', 'IT', 3, 3, 4, 'A', 0, ['flutter', 0.7, 1], ['backend', 0.5, 0]],
  ['varun', 'Varun Pillai', 'CSE', 1, 1, 5, 'D', 4, ['flutter', 0.5, 0]],
  ['aisha', 'Aisha Rahman', 'EEE', 3, 3, 3, 'B', 3, ['embedded', 0.7, 1], ['devops', 0.4, 0]],
  [
    'karthik',
    'Karthik Subramanian',
    'CSE',
    4,
    5,
    2,
    'C',
    2,
    ['backend', 0.9, 1],
    ['devops', 0.8, 1],
  ],
  [
    'divya',
    'Divya Anand',
    'AIML',
    3,
    3,
    4,
    'A',
    1,
    ['data-engineering', 0.75, 1],
    ['machine-learning', 0.5, 0],
  ],
  [
    'harsh',
    'Harsh Vardhan',
    'Civil',
    2,
    2,
    3,
    'C',
    4,
    ['content-writing', 0.6, 0],
    ['pitching', 0.45, 0],
  ],
  ['ila', 'Ila Ghosh', 'Design', 3, 3, 3, 'C', 3, ['ui-ux', 0.75, 1], ['video-editing', 0.7, 1]],
  ['jay', 'Jay Prakash', 'Mech', 3, 2, 4, 'B', 3, ['unity', 0.6, 0], ['blockchain', 0.45, 0]],
  [
    'mira',
    'Mira Sethu',
    'Biotech',
    2,
    2,
    4,
    'A',
    4,
    ['content-writing', 0.65, 1],
    ['figma', 0.4, 0],
  ],
  ['tanvi', 'Tanvi Desai', 'CSE', 3, 3, 4, 'B', 2, ['blockchain', 0.7, 1], ['backend', 0.5, 0]],
  ['rey', 'Reyansh Gill', 'CSE', 2, 2, 3, 'D', 3, ['react', 0.65, 0], ['unity', 0.5, 0]],
]

const profileRows = P.map(([handle, name, dept, year, exp, commit, av, look]) => ({
  handle,
  name,
  dept,
  year,
  experience_level: exp,
  commitment_level: commit,
  availability_windows: AV[av],
  looking_for: LOOKING[look],
  is_seed: true,
}))
const savedProfiles = await post('profiles', profileRows, 'handle')
const byHandle = new Map(savedProfiles.map((p) => [p.handle, p.id]))
console.log(`profiles: ${savedProfiles.length}`)

const skillRows = P.flatMap(([handle, , , , , , , , ...skills]) =>
  skills.map(([skill, proficiency, proved]) => ({
    profile_id: byHandle.get(handle),
    skill,
    proficiency,
    proof_url: proved ? `https://github.com/${handle}` : null,
  })),
)
await post('skills', skillRows, 'profile_id,skill')
console.log(`skills: ${skillRows.length}`)

// ---------------------------------------------------------------- squads
const eventIds = savedEvents.map((e) => e.id)
const pick = (i) => eventIds[i % eventIds.length] ?? null

const SQUADS = [
  {
    owner: 'aarav',
    event: pick(0),
    title: 'CropGuard — on-device crop disease detection',
    description:
      'Running a detection model on a phone camera for smallholder farms. The model is half-trained; it needs a face, an API and a story.',
    kind: 'hackathon',
    effort: '10-15 hrs/week',
    reqs: [
      ['machine-learning', 'ML Engineer', 3, 0.5],
      ['react', 'Frontend', 2, 0.4],
      ['figma', 'Designer', 2, 0.4],
      ['backend', 'Backend', 2, 0.4],
      ['pitching', 'Pitch & Demo', 1, 0.3],
    ],
    members: ['aarav', 'diya'],
  },
  {
    owner: 'sanjay',
    event: pick(1),
    title: 'Fraud-lens — real-time UPI anomaly detection',
    description: 'Streaming fraud flags on UPI traffic. The pipeline exists on paper only.',
    kind: 'hackathon',
    effort: '15+ hrs/week',
    reqs: [
      ['machine-learning', 'ML Engineer', 3, 0.5],
      ['data-engineering', 'Data Pipeline', 2, 0.4],
      ['react', 'Dashboard', 1, 0.4],
    ],
    members: ['sanjay'],
  },
  {
    owner: 'ritika',
    event: null,
    title: 'Campus mental-health companion',
    description:
      'A semester-long study with the psychology department. Needs an app people actually open.',
    kind: 'research',
    effort: '5-10 hrs/week',
    reqs: [
      ['flutter', 'Mobile', 3, 0.4],
      ['ui-ux', 'UX Research', 2, 0.4],
      ['content-writing', 'Content', 1, 0.3],
    ],
    members: ['ritika'],
  },
  {
    owner: 'farhan',
    event: pick(2),
    title: 'Hostel energy monitor — per-room telemetry',
    description: 'Power telemetry for every hostel room. Hardware is half-done, software is not.',
    kind: 'side_project',
    effort: '5-10 hrs/week',
    reqs: [
      ['embedded', 'Firmware', 3, 0.4],
      ['backend', 'API', 2, 0.4],
      ['figma', 'Design', 1, 0.3],
    ],
    members: ['farhan', 'aisha'],
  },
  {
    owner: 'tanvi',
    event: pick(3),
    title: 'Non-tech founder looking for builders',
    description:
      'Forty interviews done on a hostel logistics problem. I need two builders to make the MVP with me.',
    kind: 'startup',
    effort: '10-15 hrs/week',
    reqs: [
      ['react', 'Full-stack Dev', 3, 0.5],
      ['figma', 'Designer', 2, 0.4],
      ['backend', 'Backend', 2, 0.4],
    ],
    members: ['tanvi'],
  },
]

const projectRows = SQUADS.map((s) => ({
  owner_profile_id: byHandle.get(s.owner),
  event_id: s.event,
  title: s.title,
  description: s.description,
  kind: s.kind,
  effort: s.effort,
  is_seed: true,
}))
const savedProjects = await post('projects', projectRows, 'title')
const projByTitle = new Map(savedProjects.map((p) => [p.title, p.id]))
console.log(`projects: ${savedProjects.length}`)

await post(
  'requirements',
  SQUADS.flatMap((s) =>
    s.reqs.map(([skill, role_label, weight, min_proficiency]) => ({
      project_id: projByTitle.get(s.title),
      skill,
      role_label,
      weight,
      min_proficiency,
    })),
  ),
)
await post(
  'memberships',
  SQUADS.flatMap((s) =>
    s.members.map((h) => ({
      project_id: projByTitle.get(s.title),
      profile_id: byHandle.get(h),
      status: 'accepted',
    })),
  ),
  'project_id,profile_id',
)
console.log('seed complete')
