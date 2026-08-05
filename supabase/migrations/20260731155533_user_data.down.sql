-- Down-migration for 20260731155533_user_data.sql.
--
-- DESTRUCTIVE: dropping public.user_data deletes every user's synced snapshot
-- (tasks, countdowns, goals, settings, profile fields). Auth accounts themselves
-- live in auth.users and are NOT touched by this, so users would still be able to
-- log in - they would just come back to an empty dashboard, with whatever is in
-- that device's localStorage as the only surviving copy.
--
-- Take a backup before running this. Intended for tearing down a dev/branch
-- environment, not as a routine production rollback step.
--
-- Policies are dropped explicitly for clarity; `drop table` would remove them
-- anyway, but being explicit keeps this readable as the exact inverse of the up.

drop policy if exists "Users can delete their own data" on public.user_data;
drop policy if exists "Users can update their own data" on public.user_data;
drop policy if exists "Users can insert their own data" on public.user_data;
drop policy if exists "Users can select their own data" on public.user_data;

drop table if exists public.user_data;
