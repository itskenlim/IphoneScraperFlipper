-- Per-listing monitor scheduling (tiered cadence + failure backoff).
-- Safe to re-run.

alter table if exists public.listings
  add column if not exists monitor_last_checked_at timestamptz,
  add column if not exists monitor_next_check_at timestamptz,
  add column if not exists monitor_fail_count integer not null default 0,
  add column if not exists monitor_lockout_until timestamptz;

create index if not exists listings_monitor_next_check_at_idx
  on public.listings (monitor_next_check_at asc nulls first)
  where status = 'active';

create index if not exists listings_monitor_lockout_until_idx
  on public.listings (monitor_lockout_until)
  where status = 'active';
