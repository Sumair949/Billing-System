-- Steel Shop Billing — move from single-item bills to multi-line invoices.
-- ⚠️ DESTRUCTIVE: the old single-item model does not translate cleanly to
-- the new line-item model. Run on a clean dataset, or export bills first.

-- Wipe prior data so the defaults and new constraints don't fight legacy rows.
delete from public.bills;
delete from public.bill_counters;

-- search_vector references `description`, which is about to be dropped.
alter table public.bills drop column if exists search_vector;

-- Old column-level checks tied to description/bill_no length.
alter table public.bills drop constraint if exists bills_description_not_blank;
alter table public.bills drop constraint if exists bills_description_len;

-- Drop legacy columns that no longer fit the invoice model.
alter table public.bills drop column if exists description;
alter table public.bills drop column if exists amount;
alter table public.bills drop column if exists status;

-- Remove the status enum (derived from received vs total now).
drop type if exists public.bill_status;

-- New invoice-level columns.
alter table public.bills
    add column customer_name text not null default '',
    add column bill_date     date not null default current_date,
    add column received_amount numeric(14,2) not null default 0 check (received_amount >= 0),
    add column total_amount    numeric(14,2) not null default 0 check (total_amount >= 0);

alter table public.bills add constraint bills_customer_not_blank
    check (length(btrim(customer_name)) > 0);

-- Recompute search_vector against the new searchable fields.
alter table public.bills
    add column search_vector tsvector generated always as (
        to_tsvector(
            'simple',
            coalesce(bill_no, '') || ' ' || coalesce(customer_name, '')
        )
    ) stored;

create index if not exists bills_search_vector_idx
    on public.bills using gin (search_vector);
create index if not exists bills_customer_trgm_idx
    on public.bills using gin (customer_name gin_trgm_ops);
create index if not exists bills_user_customer_idx
    on public.bills (user_id, customer_name);

-- Line-items table: one row per entry on a bill.
create table if not exists public.bill_items (
    id          uuid primary key default gen_random_uuid(),
    bill_id     uuid not null references public.bills(id) on delete cascade,
    user_id     uuid not null references auth.users(id) on delete cascade,
    sr_no       int not null,
    description text not null,
    quantity    numeric(14,3) not null check (quantity > 0),
    rate        numeric(14,2) not null check (rate >= 0),
    amount      numeric(16,2) generated always as (quantity * rate) stored,
    created_at  timestamptz not null default now(),

    constraint bill_items_description_not_blank
        check (length(btrim(description)) > 0),
    constraint bill_items_description_len
        check (length(description) <= 500),
    constraint bill_items_unique_sr unique (bill_id, sr_no)
);

create index if not exists bill_items_bill_idx  on public.bill_items (bill_id, sr_no);
create index if not exists bill_items_user_idx  on public.bill_items (user_id);

alter table public.bill_items enable row level security;

drop policy if exists "bill_items_select_own" on public.bill_items;
create policy "bill_items_select_own" on public.bill_items
    for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "bill_items_insert_own" on public.bill_items;
create policy "bill_items_insert_own" on public.bill_items
    for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "bill_items_update_own" on public.bill_items;
create policy "bill_items_update_own" on public.bill_items
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "bill_items_delete_own" on public.bill_items;
create policy "bill_items_delete_own" on public.bill_items
    for delete to authenticated using (user_id = (select auth.uid()));

-- Keep bills.total_amount in sync with the sum of its items. Running in the
-- inserter's session means RLS on bills gates the UPDATE naturally — the
-- trigger can only touch rows the user already owns.
create or replace function public.update_bill_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    target_bill_id uuid;
begin
    target_bill_id := coalesce(new.bill_id, old.bill_id);

    update public.bills
    set total_amount = coalesce((
        select sum(amount)
        from public.bill_items
        where bill_id = target_bill_id
    ), 0)
    where id = target_bill_id;

    return coalesce(new, old);
end;
$$;

drop trigger if exists bill_items_update_total on public.bill_items;
create trigger bill_items_update_total
    after insert or update or delete on public.bill_items
    for each row
    execute function public.update_bill_total();
