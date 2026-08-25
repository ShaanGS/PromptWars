-- Cleanup (roadmap 3.10; REBUILD-PLAN gaps 5 and 10).
--
-- invited_emails was the allowlist for the magic-link era: it stopped
-- signInWithOtp from minting an account for any stranger who typed an email.
-- Accounts are now created only by the admin (/admin, scripts/create-user.ts)
-- and there is no sign-up path, so the account existing IS the invite. The
-- table has held the single owner seed row since 0006 and nothing reads it.
--
-- conferencealerts was a connector that only worked by impersonating a
-- browser (the site 403s any honest user agent from any IP). It was never
-- enabled, never ran, and has no events, raw listings, runs or mutes. The
-- code path goes in the same commit; the `sources` row goes here so the
-- Sources page and source_health() stop listing a source that no longer
-- exists in the registry.
drop table if exists public.invited_emails;

delete from public.sources where id = 'conferencealerts';
