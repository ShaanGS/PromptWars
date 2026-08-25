-- ---------------------------------------------------------------------------
-- Access control, phase 1.
--
-- Roles are NOT a table. They live in auth.users.raw_app_meta_data->>'role'
-- ('admin' | 'member'), set only through the admin API (service role). That
-- field is not user-writable, it is returned on every verified getUser(), and
-- it needs no join -- which is exactly what a gate wants. A profiles table
-- would have been a second source of truth for the same fact.
--
-- What does need a table is the audit trail: who granted, reset, revoked or
-- restored whom, and when. Small, append-only, service role only.
-- ---------------------------------------------------------------------------

create table access_audit (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  -- Who did it. Email is denormalised on purpose: the actor row may be gone
  -- by the time anyone reads this, and the trail must still make sense.
  actor_id     uuid,
  actor_email  text not null,
  action       text not null
                 check (action in ('create', 'reset_password', 'revoke', 'restore',
                                   'grant_admin', 'password_changed')),
  target_id    uuid,
  target_email text not null,
  detail       text
);

create index access_audit_by_time on access_audit (at desc);

alter table access_audit enable row level security;
-- No policies: the anon key sees nothing. Reads and writes go through the
-- service role from server code, after the admin check.
