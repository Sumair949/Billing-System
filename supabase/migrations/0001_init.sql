-- Steel Shop Billing — initial schema
-- Run this in Supabase SQL editor, or via `supabase db push`.

-- Extensions
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "pg_trgm";   -- trigram index for partial bill_no search

-- Bills table
create table if not exists public.bills (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    bill_no         text not null,
    description     text not null,
    amount          numeric(14,2) not null check (amount >= 0),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    search_vector   tsvector generated always as (
                        to_tsvector(
                            'simple',
                            coalesce(bill_no, '') || ' ' || coalesce(description, '')
                        )
                    ) stored,

    constraint bills_bill_no_not_blank check (length(btrim(bill_no)) > 0),
    constraint bills_description_not_blank check (length(btrim(description)) > 0),
    constraint bills_bill_no_len check (length(bill_no) <= 64),
    constraint bills_description_len check (length(description) <= 500),
    -- Each shop owner's bill numbers must be unique within their own account.
    constraint bills_user_bill_no_unique unique (user_id, bill_no)
);

-- Indexes
create index if not exists bills_user_created_idx
    on public.bills (user_id, created_at desc);

create index if not exists bills_search_vector_idx
    on public.bills using gin (search_vector);

create index if not exists bills_bill_no_trgm_idx
    on public.bills using gin (bill_no gin_trgm_ops);

create index if not exists bills_description_trgm_idx
    on public.bills using gin (description gin_trgm_ops);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
    before update on public.bills
    for each row
    execute function public.set_updated_at();

-- Row Level Security — each user only sees their own bills
alter table public.bills enable row level security;

drop policy if exists "bills_select_own" on public.bills;
create policy "bills_select_own"
    on public.bills for select
    to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "bills_insert_own" on public.bills;
create policy "bills_insert_own"
    on public.bills for insert
    to authenticated
    with check (user_id = (select auth.uid()));

drop policy if exists "bills_update_own" on public.bills;
create policy "bills_update_own"
    on public.bills for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "bills_delete_own" on public.bills;
create policy "bills_delete_own"
    on public.bills for delete
    to authenticated
    using (user_id = (select auth.uid()));
