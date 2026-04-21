-- Steel Shop Billing — wipe all user-entered data for a fresh deploy.
--
-- Run this in the Supabase SQL editor BEFORE going live. It:
--   1. Deletes every bill (bill_items cascade via FK)
--   2. Resets per-user bill_counters so numbering starts at INV-00001 again
--
-- It does NOT touch:
--   - Table/index/trigger/function DDL (migrations stay applied)
--   - Row-Level Security policies
--   - `auth.users` — delete accounts manually in
--     Supabase Dashboard → Authentication → Users
--
-- Safe to re-run; all statements are idempotent in effect.

begin;

delete from public.bill_items;
delete from public.bills;
delete from public.bill_counters;

commit;

-- Sanity check — these should all return 0.
select 'bills'           as table_name, count(*) from public.bills
union all
select 'bill_items'      as table_name, count(*) from public.bill_items
union all
select 'bill_counters'   as table_name, count(*) from public.bill_counters;
