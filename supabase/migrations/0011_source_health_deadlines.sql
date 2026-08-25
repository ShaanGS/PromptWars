-- source_health(): count deadline listings by their cutoff, not by starts_at.
--
-- Devpost and Unstop are deadline sources: `starts_at` is when the submission
-- window opened (Devpost) or is the cutoff itself (Unstop). Counting only
-- `starts_at >= now()` therefore reported 0 upcoming for a source with fifty
-- hackathons you can still enter -- and the Sources page reads that count as
-- "runs, but finds nothing", i.e. it would have shown a healthy source as
-- broken.
--
-- Stated in data rather than in a source-id list: a row still counts if it
-- either starts in the future or closes in the future.
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
      where e.source_id = s.id
        and e.status = 'active'
        and (e.starts_at >= now() or e.registration_deadline >= now())) as event_count,
    (select r.status from scrape_runs r
      where r.source_id = s.id order by r.started_at desc limit 1) as last_status,
    (select r.finished_at from scrape_runs r
      where r.source_id = s.id and r.status in ('ok','partial')
      order by r.started_at desc limit 1) as last_ok_at
  from sources s
  order by s.display_name
$$;
