-- ---------------------------------------------------------------------------
-- Helpers for the multi-user dashboard.
-- ---------------------------------------------------------------------------

-- Per-user unseen count over the active feed.
--
-- PostgREST cannot express "count events with no matching row in the user's
-- seen table", so this lives in SQL. The filter parameters come from the app
-- so the floor and source list stay defined in exactly one place (TypeScript);
-- this function only encodes the NOT EXISTS.
create or replace function public.unseen_active_count(
  p_user uuid,
  p_floor int,
  p_sources text[]
) returns bigint
language sql
stable
as $$
  select count(*)
  from events e
  where e.status = 'active'
    and e.starts_at >= now()
    and e.source_id = any (p_sources)
    and (e.relevance_score >= p_floor or e.relevance_score is null)
    and not exists (
      select 1 from user_event_seen s
      where s.user_id = p_user and s.event_id = e.id
    )
$$;

-- The owner is always invited. Everyone else is a hand-added row -- that is
-- the entire access model for the friends phase.
insert into invited_emails (email, note)
values ('shaangurushankar@gmail.com', 'owner')
on conflict (email) do nothing;

-- Applied as a follow-up (pin_function_search_path): a mutable search_path
-- lets a caller's schema settings redirect table names inside the function.
alter function public.unseen_active_count(uuid, int, text[])
  set search_path = public;
