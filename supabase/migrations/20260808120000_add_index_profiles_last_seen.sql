-- Index for "recently online" lookups (Share dialog last-seen / presence).
-- Additive, idempotent. Part of the last_seen feature (issue #71).
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON public.profiles (last_seen);
