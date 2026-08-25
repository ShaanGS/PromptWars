-- Guild schema. Seed rows carry user_id NULL (profiles) / posted_by NULL (events):
-- under RLS they can never satisfy an ownership check, so they are immutable via API.

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  handle text unique not null,
  name text not null,
  dept text not null,
  year int,
  bio text,
  experience_level int not null check (experience_level between 1 and 5),
  commitment_level int not null check (commitment_level between 1 and 5),
  availability_windows jsonb not null default '[]',
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (community_id, profile_id)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  proficiency numeric not null check (proficiency >= 0 and proficiency <= 1),
  proof_url text,
  unique (profile_id, skill)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'organiser'
    check (source in ('devfolio', 'devpost', 'unstop', 'organiser')),
  external_url text,
  title text not null,
  host text,
  mode text check (mode in ('online', 'in_person', 'hybrid')),
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  deadline_at timestamptz,
  tags text[] not null default '{}',
  posted_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source, external_url)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text,
  deadline date,
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  skill text not null,
  role_label text,
  weight numeric not null default 1 check (weight > 0),
  min_proficiency numeric not null default 0
    check (min_proficiency >= 0 and min_proficiency <= 1)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('invited', 'accepted')),
  unique (project_id, profile_id)
);

create index on public.projects (owner_profile_id);
create index on public.projects (event_id);
create index on public.projects (community_id);
create index on public.requirements (project_id);
create index on public.memberships (profile_id);
create index on public.events (deadline_at);
create index on public.events (posted_by_profile_id);
create index on public.community_members (profile_id);
