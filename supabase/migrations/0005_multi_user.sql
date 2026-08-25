-- ---------------------------------------------------------------------------
-- Multi-user foundation.
--
-- The app was built single-user: event_actions has no user column, and
-- events.seen_at is a shared clock. The moment a second person uses it, one
-- friend's "Not for me" hides an event for everyone and whoever opens the app
-- first eats all the NEW badges. These tables give each signed-in user their
-- own state.
--
-- The old event_actions table and events.seen_at stay in place untouched --
-- nothing reads them after the app switches over, and Shaan's handful of
-- existing saves can be copied to his user id with a one-off UPDATE once his
-- account exists. Dropping them is a later cleanup, deliberately not done in
-- the same migration that friends first log in on.
-- ---------------------------------------------------------------------------

-- Who is allowed to sign up. Friends-only for now: the login flow refuses
-- magic links for emails not in this table, so a leaked URL cannot become an
-- open signup page. Rows are managed by hand in the SQL editor (or a later
-- admin screen).
create table invited_emails (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);

create table user_event_actions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references events(id) on delete cascade,
  state      text not null
               check (state in ('interested', 'registered', 'going', 'skipped', 'attended')),
  note       text,
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index user_event_actions_by_event on user_event_actions (event_id);

-- Per-user NEW badges. A row means "this user has seen this event"; absence
-- means the badge shows. Kept as its own table rather than a column so the
-- events table stays user-agnostic.
create table user_event_seen (
  user_id  uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  seen_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------------------------------------------------------------------------
-- RLS. The app reads and writes through the service role server-side, so
-- deny-all would suffice today -- but these tables are user-owned by nature,
-- so give them honest owner policies now. If a client-side path ever appears,
-- it is already correctly scoped instead of relying on nobody shipping the
-- anon key.
-- ---------------------------------------------------------------------------
alter table invited_emails     enable row level security;
alter table user_event_actions enable row level security;
alter table user_event_seen    enable row level security;

-- invited_emails: no policies. Service role only.

create policy "own actions" on user_event_actions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own seen" on user_event_seen
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
