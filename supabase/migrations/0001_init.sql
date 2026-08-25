-- ---------------------------------------------------------------------------
-- Chennai events aggregator -- initial schema
--
-- Apply BEFORE deploying the app. The app asserts its schema version on
-- startup; with Vercel auto-deploying on push and migrations applied out of
-- band, deploying first ships code that reads columns which do not exist.
-- ---------------------------------------------------------------------------

-- Into `extensions`, not `public`: an extension in public exposes its
-- functions through PostgREST and can collide with application names.
-- Index definitions below therefore schema-qualify `gin_trgm_ops`.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- sources: operational overrides only.
--
-- Structural facts (does this source need the LLM, how do we parse it) live
-- in the Connector interface in code. This table owns the things you might
-- want to change without a deploy. Stated precedence, so there is never a
-- question of which one wins.
-- ---------------------------------------------------------------------------
create table sources (
  id               text primary key,
  display_name     text not null,
  enabled          boolean not null default true,
  crawl_delay_ms   int not null default 1000,
  user_agent       text,
  -- Resumability. AllEvents at a 10s crawl delay cannot finish in one run,
  -- so a connector works a bounded slice and records where it stopped.
  cursor           jsonb not null default '{}'::jsonb,
  -- "Who is in the room" defaults, overridden per-event only for the messy
  -- sources that already pay for an LLM call.
  default_audience text[] not null default '{}',
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- scrape_runs: observability. This is how a broken scraper looks broken
-- instead of looking like a quiet week.
-- ---------------------------------------------------------------------------
create table scrape_runs (
  id             bigserial primary key,
  source_id      text not null references sources(id) on delete cascade,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running'
                   check (status in ('running', 'ok', 'partial', 'error')),
  listings_found int not null default 0,
  llm_calls      int not null default 0,
  -- Which quality gates passed or failed, so a 'partial' run is debuggable
  -- after the fact.
  quality_gate   jsonb,
  http_status    int,
  -- Must carry stack + HTTP status + first 2KB of the response body. Vercel
  -- Hobby keeps logs about an hour; by the time anyone looks, the remote page
  -- has already changed and the logs are gone.
  error          text
);

-- At most one live run per source. Guards against a manual trigger racing a
-- scheduled one: two concurrent runs would double-spend the LLM budget and
-- both write events.
create unique index scrape_runs_one_active
  on scrape_runs (source_id)
  where status = 'running';

create index scrape_runs_source_started on scrape_runs (source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- raw_listings: the untouched payload.
--
-- This exists so a bad extraction prompt can be fixed and replayed over
-- history without re-scraping anyone -- which matters a great deal when the
-- free-tier LLM budget is the binding constraint.
-- ---------------------------------------------------------------------------
create table raw_listings (
  id                 bigserial primary key,
  source_id          text not null references sources(id) on delete cascade,
  -- Carries a discriminator (year, or a hash of the canonical URL). A bare
  -- slug is reused by annual events, and an iCal UID is stable per *series*,
  -- not per occurrence -- both would silently collapse rows.
  source_uid         text not null,
  run_id             bigint references scrape_runs(id) on delete set null,
  payload            jsonb not null,
  -- Hashed over the payload MINUS the connector's volatileFields. Devpost
  -- ships `time_left_to_submission` and `registrations_count`, which change
  -- daily; hashing the whole payload would insert a new row for every
  -- hackathon every day and re-score the entire corpus with it.
  content_hash       text not null,
  fetched_at         timestamptz not null default now(),
  -- Gate replays on the version, not on `normalized_at is null`. Once a row
  -- has been normalised it is stamped forever, so a null check can never
  -- replay anything after a prompt fix.
  normalizer_version int,
  normalized_at      timestamptz,
  normalize_error    text,
  unique (source_id, source_uid, content_hash)
);

create index raw_listings_pending
  on raw_listings (source_id, normalizer_version);
create index raw_listings_fetched on raw_listings (fetched_at);

-- ---------------------------------------------------------------------------
-- events: the normalised corpus.
-- ---------------------------------------------------------------------------
create table events (
  id             uuid primary key default gen_random_uuid(),
  source_id      text not null references sources(id) on delete cascade,
  source_uid     text not null,
  raw_listing_id bigint references raw_listings(id) on delete set null,

  title          text not null,
  -- Lowercased, diacritics and emoji stripped, and series/city noise removed
  -- ("chennai", "india", "#4", "vol. 3", a bare year). Trigram-indexed.
  title_norm     text,
  description    text,
  url            text not null,
  -- The strongest dedupe signal by a wide margin: AllEvents and
  -- ConferenceAlerts routinely link back to the original Luma listing.
  canonical_url  text,
  organizer      text,
  organizer_norm text,

  -- Dates. `*_local` is the wall time exactly as the source stated it and is
  -- what the UI renders; the timestamptz columns are derived and exist only
  -- so Postgres can sort and range-filter.
  starts_at_local       timestamp,
  ends_at_local         timestamp,
  tz                    text not null default 'Asia/Kolkata',
  starts_at             timestamptz,
  ends_at               timestamptz,
  registration_deadline timestamptz,
  date_precision text check (date_precision in ('instant', 'day', 'month', 'unknown')),
  -- Devpost publishes a submission window, not a start time. Rendering its
  -- period end as a start date shows "15 Sep" for a hackathon you could join
  -- today, which buries exactly what needs surfacing.
  date_kind      text check (date_kind in ('start', 'deadline', 'window', 'tba')),

  is_online      boolean not null default false,
  city           text,
  -- Guindy vs OMR vs Anna Nagar is 20 minutes vs 90. Derived from a keyword
  -- lookup over venue, no geocoding API.
  area           text,
  venue          text,
  event_type     text,
  tags           text[] not null default '{}',
  audience       text[] not null default '{}',
  goal_fit       text check (goal_fit in ('leads', 'hiring', 'learning', 'social')),
  price_type     text not null default 'unknown'
                   check (price_type in ('free', 'paid', 'unknown')),
  price_amount   numeric,
  price_currency text,

  -- Scoring-relevant fields only: title, description, tags, event_type.
  -- Deliberately excludes url, venue and every timestamp, so a cosmetic
  -- change upstream does not trigger a re-score.
  content_hash        text not null,
  relevance_score     int check (relevance_score between 0 and 100),
  relevance_reason    text,
  relevance_scored_at timestamptz,
  profile_hash        text,
  scoring_version     int,
  -- Which model produced the score. Rotating providers mid-corpus would make
  -- the dashboard ordering a function of which key was up.
  scoring_model       text,

  -- Nothing is deleted at ingest. Filtering happens at query time so the
  -- "Filtered out (N)" drawer can prove nothing real was thrown away.
  status text not null default 'active'
    check (status in ('active', 'past', 'filtered_geo', 'filtered_quality', 'delisted')),
  -- NULL = never seen. Drives the NEW badge. Per-event rather than a global
  -- "last visited" clock, which any crawler hitting the public URL would
  -- silently and permanently clear.
  seen_at            timestamptz,
  missing_run_count  int not null default 0,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),

  unique (source_id, source_uid)
);

create index events_active_start on events (starts_at) where status = 'active';
create index events_relevance on events (relevance_score desc nulls last);
create index events_deadline on events (registration_deadline) where status = 'active';
create index events_unseen on events (seen_at) where seen_at is null;
create index events_first_seen on events (first_seen_at desc);
create index events_source on events (source_id, last_seen_at);
create index events_title_trgm on events using gin (title_norm extensions.gin_trgm_ops);
create index events_tags on events using gin (tags);
create index events_search on events using gin (
  to_tsvector('english', title || ' ' || coalesce(description, ''))
);
create index events_canonical_url on events (canonical_url) where canonical_url is not null;

-- ---------------------------------------------------------------------------
-- Duplicate links are pairwise and DERIVED. Groups are computed by union-find
-- over this table, never stored on the event.
--
-- A stored group id drifts monotonically wrong: when an event's date shifts
-- between scrapes its key changes and nothing ever removes it from its old
-- group. Rebuilding links per run makes that self-healing for free.
-- ---------------------------------------------------------------------------
create table event_duplicate_links (
  a_id        uuid not null references events(id) on delete cascade,
  b_id        uuid not null references events(id) on delete cascade,
  score       real not null,
  method      text not null,
  computed_at timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);

create index event_dup_b on event_duplicate_links (b_id);

-- ---------------------------------------------------------------------------
-- Per-event state. Without this it is a feed, not a tool: every visit means
-- re-triaging the same events you already judged.
-- ---------------------------------------------------------------------------
create table event_actions (
  event_id   uuid primary key references events(id) on delete cascade,
  state      text not null
               check (state in ('interested', 'registered', 'going', 'skipped', 'attended')),
  note       text,
  updated_at timestamptz not null default now()
);

create index event_actions_state on event_actions (state);

-- Deterministic, free, and instantly fixes the ConferenceAlerts spam problem
-- without spending an LLM call on it.
create table mute_rules (
  id      serial primary key,
  kind    text not null check (kind in ('organizer', 'keyword', 'source')),
  value   text not null,
  enabled boolean not null default true,
  unique (kind, value)
);

-- ---------------------------------------------------------------------------
-- Singleton. The row is created here so the very first query cannot fail on a
-- missing row.
-- ---------------------------------------------------------------------------
create table app_state (
  id                  int primary key default 1 check (id = 1),
  -- Mirrors the hash of config/interest-profile.ts. A mismatch triggers a
  -- rescore automatically, rather than relying on anyone to remember.
  profile_hash        text not null default '',
  scoring_version     int not null default 1,
  normalizer_version  int not null default 1,
  -- Guards the first-run NEW badge: stamping every backfilled event as new
  -- would make the badge meaningless on day one and forever after.
  first_backfill_done boolean not null default false,
  updated_at          timestamptz not null default now()
);

insert into app_state (id) values (1);

-- ---------------------------------------------------------------------------
-- Security: RLS on with ZERO policies -- deny all.
--
-- Tables made by raw SQL have RLS disabled by default. The stock Supabase
-- + Next.js pattern ships the anon key in the JS bundle, so without this
-- anyone who loads the dashboard could DELETE FROM events through PostgREST.
-- All application access goes through the service role, server-side only.
-- ---------------------------------------------------------------------------
alter table sources               enable row level security;
alter table scrape_runs           enable row level security;
alter table raw_listings          enable row level security;
alter table events                enable row level security;
alter table event_duplicate_links enable row level security;
alter table event_actions         enable row level security;
alter table mute_rules            enable row level security;
alter table app_state             enable row level security;

revoke all on all tables in schema public from anon, authenticated;
