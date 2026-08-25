-- Deny-by-default: RLS on with no policy blocks everything, so each grant below is
-- the complete surface. auth.uid() is wrapped in (select ...) so Postgres evaluates
-- it once per query, not per row.

alter table public.communities        enable row level security;
alter table public.community_members  enable row level security;
alter table public.profiles           enable row level security;
alter table public.skills             enable row level security;
alter table public.events             enable row level security;
alter table public.projects           enable row level security;
alter table public.requirements       enable row level security;
alter table public.memberships        enable row level security;

-- The talent pool, projects, and events are public showcase data.
create policy read_all on public.communities       for select to anon, authenticated using (true);
create policy read_all on public.community_members for select to anon, authenticated using (true);
create policy read_all on public.profiles          for select to anon, authenticated using (true);
create policy read_all on public.skills            for select to anon, authenticated using (true);
create policy read_all on public.events            for select to anon, authenticated using (true);
create policy read_all on public.projects          for select to anon, authenticated using (true);
create policy read_all on public.requirements      for select to anon, authenticated using (true);
create policy read_all on public.memberships       for select to anon, authenticated using (true);

-- PROFILES: one profile bound to your uid; you edit only yours. Seed rows (user_id
-- NULL) can never match, so demo visitors cannot claim or vandalize seed people.
-- No delete policy: nothing deletes profiles through the API.
create policy insert_own on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- SKILLS: writable only through your own profile — nobody forges proficiency or
-- proof links on someone else (which would corrupt their Guild Score and every
-- team score they appear in).
create policy write_own on public.skills for all to authenticated
  using (profile_id in (select id from public.profiles where user_id = (select auth.uid())))
  with check (profile_id in (select id from public.profiles where user_id = (select auth.uid())));

-- EVENTS: signed-in users post as themselves ('organiser' source only, so nobody can
-- forge an ingested-looking Devfolio/Devpost/Unstop row); only the poster edits or
-- deletes their post. Ingested rows (posted_by NULL) are immutable via the API.
create policy post_own on public.events for insert to authenticated
  with check (
    source = 'organiser'
    and posted_by_profile_id in
      (select id from public.profiles where user_id = (select auth.uid()))
  );
create policy poster_update on public.events for update to authenticated
  using (posted_by_profile_id in
    (select id from public.profiles where user_id = (select auth.uid())))
  with check (
    source = 'organiser'
    and posted_by_profile_id in
      (select id from public.profiles where user_id = (select auth.uid()))
  );
create policy poster_delete on public.events for delete to authenticated
  using (posted_by_profile_id in
    (select id from public.profiles where user_id = (select auth.uid())));

-- PROJECTS: create as yourself; only the owner mutates. Demo visitors cannot touch
-- the seeded flagship project the judges see.
create policy insert_own on public.projects for insert to authenticated
  with check (owner_profile_id in
    (select id from public.profiles where user_id = (select auth.uid())));
create policy owner_update on public.projects for update to authenticated
  using (owner_profile_id in
    (select id from public.profiles where user_id = (select auth.uid())))
  with check (owner_profile_id in
    (select id from public.profiles where user_id = (select auth.uid())));
create policy owner_delete on public.projects for delete to authenticated
  using (owner_profile_id in
    (select id from public.profiles where user_id = (select auth.uid())));

-- REQUIREMENTS + MEMBERSHIPS: writable only via a project you own. Stops tampering
-- with seed-project requirement weights (which would silently corrupt every demo
-- score) and strangers adding/removing people on someone else's team.
create policy owner_writes on public.requirements for all to authenticated
  using (project_id in
    (select p.id from public.projects p
      join public.profiles pr on pr.id = p.owner_profile_id
      where pr.user_id = (select auth.uid())))
  with check (project_id in
    (select p.id from public.projects p
      join public.profiles pr on pr.id = p.owner_profile_id
      where pr.user_id = (select auth.uid())));
create policy owner_writes on public.memberships for all to authenticated
  using (project_id in
    (select p.id from public.projects p
      join public.profiles pr on pr.id = p.owner_profile_id
      where pr.user_id = (select auth.uid())))
  with check (project_id in
    (select p.id from public.projects p
      join public.profiles pr on pr.id = p.owner_profile_id
      where pr.user_id = (select auth.uid())));

-- COMMUNITIES: read-only in v1 (seed-managed).
