-- The health strip used to issue two queries per source from the app -- 16
-- sequential round trips on every page load, the biggest share of the
-- filter-click lag. One function, one round trip.
create or replace function public.source_health()
returns table (
  id text,
  display_name text,
  enabled boolean,
  event_count bigint,
  last_status text,
  last_ok_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    s.id,
    s.display_name,
    s.enabled,
    (select count(*) from events e
      where e.source_id = s.id and e.status = 'active' and e.starts_at >= now()) as event_count,
    (select r.status from scrape_runs r
      where r.source_id = s.id order by r.started_at desc limit 1) as last_status,
    (select r.finished_at from scrape_runs r
      where r.source_id = s.id and r.status in ('ok','partial')
      order by r.started_at desc limit 1) as last_ok_at
  from sources s
  order by s.display_name
$$;
