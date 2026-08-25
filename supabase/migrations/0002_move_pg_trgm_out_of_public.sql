-- ---------------------------------------------------------------------------
-- Corrective migration.
--
-- 0001 originally created pg_trgm in `public`, which Supabase's security
-- linter flags: extensions in public are reachable through PostgREST and can
-- collide with application object names. 0001 has since been corrected to
-- create it in `extensions` directly, so on a fresh database this is a no-op.
--
-- Guarded rather than unconditional so it replays safely from either state.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$$;
