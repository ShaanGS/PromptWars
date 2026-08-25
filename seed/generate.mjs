// Single source of truth for demo data. Emits supabase/seed.sql AND
// src/repo/static-seed.json so the database and the DEMO_MODE=static fallback
// can never drift apart. Run: node seed/generate.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const pid = (n) => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const eid = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const rid = (n) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const jid = (n) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const COMMUNITY = 'c0000000-0000-4000-8000-000000000001'
const FLAGSHIP = jid(1)

// Availability patterns. A = Tue/Thu evenings (flagship team + best candidates),
// B = Mon/Wed evenings, C = weekend mornings (the dead-zone demo candidate),
// D = late nights daily.
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
  AB: [
    { day: 2, start: '18:00', end: '21:00' },
    { day: 4, start: '18:00', end: '21:00' },
    { day: 1, start: '18:00', end: '21:00' },
  ],
}

const gh = (h) => `https://github.com/${h}`
// [handle, name, dept, year, exp, commit, availability, [skill, prof, proof?]...]
// Deliberate duplicate-skill clusters: 12 React-heavy profiles make the
// diminishing-returns demo land; figma and pitching are scarce on purpose.
const P = [
  ['aarav', 'Aarav Menon', 'CSE', 3, 4, 5, 'A', ['machine-learning', 0.7, 1], ['backend', 0.4, 0]],
  ['diya', 'Diya Sharma', 'CSE', 3, 3, 5, 'A', ['backend', 0.75, 1], ['devops', 0.5, 0]],
  ['rohan', 'Rohan Iyer', 'CSE', 2, 3, 4, 'A', ['react', 0.85, 1], ['ui-ux', 0.4, 0]],
  ['meera', 'Meera Pillai', 'Design', 3, 4, 4, 'A', ['figma', 0.85, 1], ['ui-ux', 0.8, 1]],
  ['kabir', 'Kabir Bedi', 'MBA', 2, 3, 4, 'AB', ['pitching', 0.8, 1], ['content-writing', 0.6, 0]],
  [
    'ananya',
    'Ananya Rao',
    'AIML',
    4,
    5,
    3,
    'C',
    ['machine-learning', 0.9, 1],
    ['data-engineering', 0.7, 1],
  ],
  ['vikram', 'Vikram Nair', 'CSE', 3, 3, 4, 'A', ['react', 0.8, 1], ['backend', 0.5, 0]],
  ['ishita', 'Ishita Das', 'IT', 2, 2, 5, 'B', ['react', 0.7, 0], ['flutter', 0.5, 0]],
  ['aditya', 'Aditya Kumar', 'CSE', 2, 2, 4, 'A', ['react', 0.75, 1]],
  ['sneha', 'Sneha Reddy', 'IT', 3, 3, 3, 'B', ['react', 0.7, 1], ['ui-ux', 0.5, 0]],
  ['arjun', 'Arjun Verma', 'CSE', 1, 1, 5, 'D', ['react', 0.55, 0]],
  ['nisha', 'Nisha Patel', 'IT', 2, 2, 4, 'B', ['react', 0.65, 0], ['content-writing', 0.5, 0]],
  ['dev', 'Dev Malhotra', 'CSE', 3, 3, 2, 'D', ['react', 0.8, 1], ['blockchain', 0.6, 0]],
  ['tara', 'Tara Krishnan', 'CSE', 2, 2, 4, 'A', ['react', 0.6, 0], ['figma', 0.45, 0]],
  ['yash', 'Yash Gupta', 'IT', 3, 3, 3, 'B', ['react', 0.7, 0], ['devops', 0.45, 0]],
  ['zoya', 'Zoya Khan', 'CSE', 2, 3, 4, 'A', ['react', 0.75, 1], ['backend', 0.45, 0]],
  ['farhan', 'Farhan Ali', 'ECE', 3, 3, 4, 'B', ['embedded', 0.8, 1], ['backend', 0.4, 0]],
  ['priya', 'Priya Menon', 'ECE', 2, 2, 3, 'C', ['embedded', 0.6, 0], ['machine-learning', 0.4, 0]],
  ['sanjay', 'Sanjay Rathi', 'CSE', 4, 4, 3, 'B', ['backend', 0.85, 1], ['devops', 0.7, 1]],
  ['kavya', 'Kavya Nambiar', 'IT', 3, 3, 4, 'A', ['backend', 0.7, 1], ['data-engineering', 0.5, 0]],
  ['rahul', 'Rahul Joshi', 'CSE', 2, 2, 4, 'B', ['backend', 0.6, 0]],
  [
    'anika',
    'Anika Singh',
    'AIML',
    3,
    4,
    4,
    'B',
    ['machine-learning', 0.75, 1],
    ['data-engineering', 0.6, 1],
  ],
  ['manav', 'Manav Shah', 'AIML', 2, 2, 3, 'D', ['machine-learning', 0.55, 0]],
  [
    'leela',
    'Leela Chandran',
    'Design',
    2,
    2,
    4,
    'B',
    ['figma', 0.65, 0],
    ['video-editing', 0.6, 1],
  ],
  ['omar', 'Omar Sheikh', 'Mech', 3, 3, 3, 'C', ['unity', 0.7, 1], ['video-editing', 0.5, 0]],
  [
    'ritika',
    'Ritika Bose',
    'Biotech',
    4,
    4,
    4,
    'B',
    ['data-engineering', 0.7, 1],
    ['content-writing', 0.7, 1],
  ],
  ['arnav', 'Arnav Kapoor', 'CSE', 3, 3, 3, 'B', ['cybersecurity', 0.8, 1], ['backend', 0.55, 0]],
  [
    'sara',
    'Sara Thomas',
    'IT',
    2,
    2,
    5,
    'A',
    ['cybersecurity', 0.55, 0],
    ['content-writing', 0.4, 0],
  ],
  ['nikhil', 'Nikhil Menon', 'CSE', 2, 3, 4, 'B', ['flutter', 0.8, 1], ['ui-ux', 0.5, 0]],
  ['pooja', 'Pooja Hegde', 'IT', 3, 3, 4, 'A', ['flutter', 0.7, 1], ['backend', 0.5, 0]],
  ['varun', 'Varun Pillai', 'CSE', 1, 1, 5, 'D', ['flutter', 0.5, 0]],
  ['aisha', 'Aisha Rahman', 'EEE', 3, 3, 3, 'B', ['embedded', 0.7, 1], ['devops', 0.4, 0]],
  ['karthik', 'Karthik Subramanian', 'CSE', 4, 5, 2, 'C', ['backend', 0.9, 1], ['devops', 0.8, 1]],
  [
    'divya',
    'Divya Anand',
    'AIML',
    3,
    3,
    4,
    'A',
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
    ['content-writing', 0.6, 0],
    ['pitching', 0.45, 0],
  ],
  ['ila', 'Ila Ghosh', 'Design', 3, 3, 3, 'C', ['ui-ux', 0.75, 1], ['video-editing', 0.7, 1]],
  ['jay', 'Jay Prakash', 'Mech', 3, 2, 4, 'B', ['unity', 0.6, 0], ['blockchain', 0.45, 0]],
  ['mira', 'Mira Sethu', 'Biotech', 2, 2, 4, 'A', ['content-writing', 0.65, 1], ['figma', 0.4, 0]],
  ['tanvi', 'Tanvi Desai', 'CSE', 3, 3, 4, 'B', ['blockchain', 0.7, 1], ['backend', 0.5, 0]],
  ['rey', 'Reyansh Gill', 'CSE', 2, 2, 3, 'D', ['react', 0.65, 0], ['unity', 0.5, 0]],
]

const profiles = P.map((row, i) => {
  const [handle, name, dept, year, exp, commit, av, ...skills] = row
  return {
    id: pid(i + 1),
    handle,
    name,
    dept,
    year,
    bio: null,
    experience_level: exp,
    commitment_level: commit,
    availability_windows: AV[av],
    is_seed: true,
    skills: skills.map(([skill, proficiency, proved]) => ({
      skill,
      proficiency,
      proof_url: proved ? gh(handle) : null,
    })),
  }
})

// Events: the flagship's own event plus everything the ingest pulled live.
const ingested = JSON.parse(readFileSync('ingest/events.json', 'utf8'))
const events = [
  {
    id: eid(1),
    source: 'organiser',
    external_url: 'https://sih.gov.in',
    title: 'Smart India Hackathon 2026',
    host: 'MoE Innovation Cell',
    mode: 'hybrid',
    location: 'Nationwide',
    starts_at: '2026-09-18T04:30:00Z',
    ends_at: '2026-09-19T14:30:00Z',
    deadline_at: '2026-09-10T18:29:00Z',
    tags: ['hackathon', 'national'],
    posted_by_profile_id: null,
  },
  ...ingested.map((e, i) => ({ id: eid(i + 2), ...e, posted_by_profile_id: null })),
]

const projects = [
  {
    id: FLAGSHIP,
    owner: pid(1),
    event_id: eid(1),
    title: 'CropGuard — AgriTech squad for SIH',
    description:
      'On-device crop disease detection for smallholder farms. Model is half-trained; needs a face, an API, and a story.',
    deadline: '2026-09-10',
    requirements: [
      ['machine-learning', 'ML Engineer', 3, 0.5],
      ['react', 'Frontend', 2, 0.4],
      ['figma', 'Designer', 2, 0.4],
      ['backend', 'Backend', 2, 0.4],
      ['pitching', 'Pitch & Demo', 1, 0.3],
    ],
    members: [pid(1), pid(2)],
  },
  {
    id: jid(2),
    owner: pid(19),
    event_id: eid(2),
    title: 'Fraud-lens — payments anomaly detection',
    description: 'Real-time UPI fraud flagging. Streaming pipeline exists on paper only.',
    deadline: '2026-09-20',
    requirements: [
      ['machine-learning', 'ML Engineer', 3, 0.5],
      ['data-engineering', 'Data Pipeline', 2, 0.4],
      ['react', 'Dashboard', 1, 0.4],
    ],
    members: [pid(19)],
  },
  {
    id: jid(3),
    owner: pid(26),
    event_id: null,
    title: 'Campus mental-health companion (research)',
    description:
      'Semester-long study with the psychology dept — needs an app people actually open.',
    deadline: '2026-11-30',
    requirements: [
      ['flutter', 'Mobile', 3, 0.4],
      ['ui-ux', 'UX Research', 2, 0.4],
      ['content-writing', 'Content', 1, 0.3],
    ],
    members: [pid(26)],
  },
  {
    id: jid(4),
    owner: pid(17),
    event_id: eid(3),
    title: 'Hostel energy monitor — IoT squad',
    description: 'Per-room power telemetry for the hostels. Hardware half-done.',
    deadline: '2026-10-05',
    requirements: [
      ['embedded', 'Firmware', 3, 0.4],
      ['backend', 'API', 2, 0.4],
      ['figma', 'Design', 1, 0.3],
    ],
    members: [pid(17), pid(32)],
  },
]

// ---------- emit SQL ----------
const q = (v) => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `array[${v.map(q).join(',')}]::text[]`
  if (typeof v === 'object') return jsonb(v)
  return `'${String(v).replaceAll("'", "''")}'`
}
const jsonb = (v) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`

let sql = `-- Generated by seed/generate.mjs. Do not edit by hand.
truncate public.memberships, public.requirements, public.projects, public.events,
  public.skills, public.community_members, public.profiles, public.communities cascade;

insert into public.communities (id, slug, name) values
  (${q(COMMUNITY)}, 'srm', 'SRM Institute of Science and Technology');
`

sql +=
  '\ninsert into public.profiles (id, user_id, handle, name, dept, year, bio, experience_level, commitment_level, availability_windows, is_seed) values\n'
sql +=
  profiles
    .map(
      (p) =>
        `  (${q(p.id)}, null, ${q(p.handle)}, ${q(p.name)}, ${q(p.dept)}, ${q(p.year)}, ${q(p.bio)}, ${p.experience_level}, ${p.commitment_level}, ${jsonb(p.availability_windows)}, true)`,
    )
    .join(',\n') + ';\n'

sql += '\ninsert into public.community_members (community_id, profile_id) values\n'
sql += profiles.map((p) => `  (${q(COMMUNITY)}, ${q(p.id)})`).join(',\n') + ';\n'

sql += '\ninsert into public.skills (profile_id, skill, proficiency, proof_url) values\n'
sql +=
  profiles
    .flatMap((p) =>
      p.skills.map((s) => `  (${q(p.id)}, ${q(s.skill)}, ${s.proficiency}, ${q(s.proof_url)})`),
    )
    .join(',\n') + ';\n'

sql +=
  '\ninsert into public.events (id, source, external_url, title, host, mode, location, starts_at, ends_at, deadline_at, tags, posted_by_profile_id) values\n'
sql +=
  events
    .map(
      (e) =>
        `  (${q(e.id)}, ${q(e.source)}, ${q(e.external_url)}, ${q(e.title)}, ${q(e.host)}, ${q(e.mode)}, ${q(e.location)}, ${q(e.starts_at)}, ${q(e.ends_at)}, ${q(e.deadline_at)}, ${q(e.tags)}, null)`,
    )
    .join(',\n') + ';\n'

sql +=
  '\ninsert into public.projects (id, owner_profile_id, community_id, event_id, title, description, deadline, is_seed) values\n'
sql +=
  projects
    .map(
      (p) =>
        `  (${q(p.id)}, ${q(p.owner)}, ${q(COMMUNITY)}, ${q(p.event_id)}, ${q(p.title)}, ${q(p.description)}, ${q(p.deadline)}, true)`,
    )
    .join(',\n') + ';\n'

let reqCount = 0
sql +=
  '\ninsert into public.requirements (id, project_id, skill, role_label, weight, min_proficiency) values\n'
sql +=
  projects
    .flatMap((p) =>
      p.requirements.map(
        ([skill, label, weight, minp]) =>
          `  (${q(rid(++reqCount))}, ${q(p.id)}, ${q(skill)}, ${q(label)}, ${weight}, ${minp})`,
      ),
    )
    .join(',\n') + ';\n'

sql += '\ninsert into public.memberships (project_id, profile_id, status) values\n'
sql +=
  projects.flatMap((p) => p.members.map((m) => `  (${q(p.id)}, ${q(m)}, 'accepted')`)).join(',\n') +
  ';\n'

// ---------- emit static JSON (same ids, app-shaped) ----------
reqCount = 0
const staticSeed = {
  flagshipProjectId: FLAGSHIP,
  community: { id: COMMUNITY, slug: 'srm', name: 'SRM Institute of Science and Technology' },
  profiles: profiles.map(({ skills, ...p }) => ({ ...p, user_id: null, skills })),
  events,
  projects: projects.map((p) => ({
    id: p.id,
    owner_profile_id: p.owner,
    community_id: COMMUNITY,
    event_id: p.event_id,
    title: p.title,
    description: p.description,
    deadline: p.deadline,
    is_seed: true,
    requirements: p.requirements.map(([skill, role_label, weight, min_proficiency]) => ({
      id: rid(++reqCount),
      skill,
      role_label,
      weight,
      min_proficiency,
    })),
    member_ids: p.members,
  })),
}

mkdirSync('supabase', { recursive: true })
writeFileSync('supabase/seed.sql', sql)
writeFileSync('src/repo/static-seed.json', JSON.stringify(staticSeed, null, 1))
console.log(
  `seed.sql: ${profiles.length} profiles, ${events.length} events, ${projects.length} projects, ${reqCount} requirements`,
)
