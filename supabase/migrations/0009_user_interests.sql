-- ---------------------------------------------------------------------------
-- Per-user interests (onboarding + /interests).
--
-- One row per user. `tags` is the chosen subset of config/interest-tags.ts;
-- `prefs` is a small JSON of where/when choices; `seed_event_ids` are the
-- events tapped in onboarding step 3 (also written to user_event_actions as
-- 'interested', this is just the record of the seed). Ranking reads this in
-- TypeScript (lib/ranking.ts) -- no SQL scoring, no LLM per user.
--
-- Whether a user has finished onboarding is also mirrored to
-- auth app_metadata.onboarded so the middleware can gate without a query.
-- ---------------------------------------------------------------------------
create table user_interests (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  tags         text[] not null default '{}',
  prefs        jsonb not null default '{}'::jsonb,
  seed_event_ids uuid[] not null default '{}',
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);

alter table user_interests enable row level security;

create policy "own interests" on user_interests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
