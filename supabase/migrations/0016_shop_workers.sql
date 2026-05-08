create table if not exists public.shop_workers (
    id             uuid        primary key default gen_random_uuid(),
    owner_id       uuid        not null references auth.users(id) on delete cascade,
    worker_user_id uuid        not null references auth.users(id) on delete cascade,
    display_name   text        not null,
    is_active      boolean     not null default true,
    created_at     timestamptz not null default now(),
    constraint shop_workers_unique_pair unique (owner_id, worker_user_id)
);

alter table public.shop_workers enable row level security;

-- Owners can create, read, update, delete their own workers
drop policy if exists "owners_manage_workers" on public.shop_workers;
create policy "owners_manage_workers"
    on public.shop_workers
    for all
    to authenticated
    using  (owner_id = auth.uid())
    with check (owner_id = auth.uid());

-- Workers can read their own row (to resolve owner_id)
drop policy if exists "workers_read_own" on public.shop_workers;
create policy "workers_read_own"
    on public.shop_workers
    for select
    to authenticated
    using (worker_user_id = auth.uid());

-- Workers can read their owner's bills (needed for print pages)
drop policy if exists "workers_read_owner_bills" on public.bills;
create policy "workers_read_owner_bills"
    on public.bills
    for select
    to authenticated
    using (
        user_id = (
            select owner_id from public.shop_workers
            where worker_user_id = auth.uid()
            limit 1
        )
    );

-- Workers can read their owner's bill_items (needed for print pages)
drop policy if exists "workers_read_owner_bill_items" on public.bill_items;
create policy "workers_read_owner_bill_items"
    on public.bill_items
    for select
    to authenticated
    using (
        user_id = (
            select owner_id from public.shop_workers
            where worker_user_id = auth.uid()
            limit 1
        )
    );
