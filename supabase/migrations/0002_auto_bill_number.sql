-- Steel Shop Billing — auto-generated, per-user bill numbers.
-- Bill numbers are assigned by the database (not the client) to guarantee
-- they are sequential, unique per user, and race-safe under concurrent inserts.

-- Per-user counter for the next bill number.
create table if not exists public.bill_counters (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    next_number bigint not null default 1
);

-- RLS scopes counter access to the owning user. The trigger runs in the
-- inserter's session, so the INSERT and UPDATE it performs go through RLS
-- just like any other query — which means we need matching policies here.
-- (Relying on SECURITY DEFINER to bypass RLS is fragile on Supabase because
-- the authenticated role's session context can prevent the owner switch
-- from granting BYPASSRLS. Explicit policies are safer and still secure,
-- because each user can only write their own counter row, and bill numbers
-- are still uniquely constrained per-user on the `bills` table.)
alter table public.bill_counters enable row level security;

drop policy if exists "bill_counters_select_own" on public.bill_counters;
create policy "bill_counters_select_own"
    on public.bill_counters for select
    to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "bill_counters_insert_own" on public.bill_counters;
create policy "bill_counters_insert_own"
    on public.bill_counters for insert
    to authenticated
    with check (user_id = (select auth.uid()));

drop policy if exists "bill_counters_update_own" on public.bill_counters;
create policy "bill_counters_update_own"
    on public.bill_counters for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

-- Generate a bill_no like 'INV-00001' on insert. Runs BEFORE INSERT so the
-- NOT NULL and length checks on bills.bill_no pass on the post-trigger row.
-- The "leave existing bill_no alone" escape hatch (for future legacy imports)
-- is implemented in the function body rather than in a trigger WHEN clause —
-- WHEN clauses that compare NULL values have tripped us up in practice.
create or replace function public.assign_bill_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    seq bigint;
begin
    -- Escape hatch: if a client explicitly supplied a bill_no, keep it.
    if new.bill_no is not null and btrim(new.bill_no) <> '' then
        return new;
    end if;

    -- Lazy-create the counter row for this user on their first bill.
    insert into public.bill_counters (user_id, next_number)
    values (new.user_id, 1)
    on conflict (user_id) do nothing;

    -- Atomic read-and-increment. The UPDATE row lock serializes concurrent
    -- inserts by the same user, so numbers are strictly sequential with
    -- no duplicates and no gaps (within a successful transaction).
    update public.bill_counters
    set    next_number = next_number + 1
    where  user_id = new.user_id
    returning next_number - 1 into seq;

    if seq is null then
        raise exception 'assign_bill_number: counter missing for user %', new.user_id;
    end if;

    new.bill_no := 'INV-' || lpad(seq::text, 5, '0');
    return new;
end;
$$;

drop trigger if exists bills_assign_number on public.bills;
create trigger bills_assign_number
    before insert on public.bills
    for each row
    execute function public.assign_bill_number();

-- Bill_no must still pass the length/blank checks defined in 0001, but
-- since the trigger fires BEFORE and sets the value, those checks pass.
-- We also need the column to *accept* NULL at the time the client sends
-- an insert. Postgres runs NOT NULL AFTER BEFORE triggers, so we keep the
-- NOT NULL — the trigger will have populated it by then.

-- Seed counters for any pre-existing bills so new numbers don't collide
-- with bills inserted by earlier versions of this app.
insert into public.bill_counters (user_id, next_number)
select user_id, count(*) + 1
from public.bills
group by user_id
on conflict (user_id) do update
set next_number = greatest(excluded.next_number, public.bill_counters.next_number);
