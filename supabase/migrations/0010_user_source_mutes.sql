-- Per-user source mutes. A muted source disappears from that person's
-- feed, All events and the calendar's "Everything" scope; their saved
-- events from it stay. Nothing global changes -- enabling/disabling a
-- source for everyone is the seed's job (config/sources.ts).
create table user_source_mutes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  source_id  text not null references sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

alter table user_source_mutes enable row level security;

create policy "own mutes" on user_source_mutes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
