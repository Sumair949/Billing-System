-- Steel Shop Billing — payment status.
-- Each bill tracks whether the shop has been paid or is still owed.
-- Default 'unpaid' so new bills start as receivable, matching real-world flow.

do $$
begin
    if not exists (select 1 from pg_type where typname = 'bill_status') then
        create type public.bill_status as enum ('unpaid', 'paid');
    end if;
end
$$;

alter table public.bills
    add column if not exists status public.bill_status not null default 'unpaid';

-- Composite index to make "outstanding" queries fast as the table grows.
create index if not exists bills_user_status_idx
    on public.bills (user_id, status);
