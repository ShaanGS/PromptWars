-- Discovery leads: what the weekly Google CSE sweep found, awaiting a human.
--
-- Search snippets are too thin to become events automatically -- a snippet
-- routinely has the year wrong or describes last year's edition. So the
-- sweep writes LEADS, the admin reviews them at /admin/discovery, and the
-- good ones go through /admin/add (paste-to-event) where every field is
-- confirmed before anything reaches the feed. Nothing is silently deleted:
-- dismissed leads keep their row and their status.

create table discovery_leads (
  id           bigint generated always as identity primary key,
  found_at     timestamptz not null default now(),
  -- The query that surfaced it, so a noisy query is traceable to its noise.
  query        text not null,
  title        text not null,
  url          text not null,
  snippet      text,
  domain       text not null,
  status       text not null default 'new'
                 check (status in ('new', 'dismissed', 'used')),
  decided_at   timestamptz
);

-- One lead per URL, ever: a re-run must not resurface what was dismissed.
create unique index discovery_leads_url on discovery_leads (url);
create index discovery_leads_new on discovery_leads (status, found_at desc);

alter table discovery_leads enable row level security;
-- Service role only, like the pipeline tables; no client policies.
