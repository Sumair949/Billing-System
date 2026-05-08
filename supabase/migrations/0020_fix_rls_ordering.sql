-- Fix non-deterministic LIMIT 1 in worker RLS subqueries (migration 0016).
-- Without ORDER BY, if a worker ever had duplicate rows the result was random.
-- Adding ORDER BY created_at ASC makes the lookup deterministic.

drop policy if exists "workers_read_owner_bills" on public.bills;
create policy "workers_read_owner_bills"
    on public.bills
    for select
    to authenticated
    using (
        user_id = (
            select owner_id from public.shop_workers
            where worker_user_id = auth.uid()
            order by created_at asc
            limit 1
        )
    );

drop policy if exists "workers_read_owner_bill_items" on public.bill_items;
create policy "workers_read_owner_bill_items"
    on public.bill_items
    for select
    to authenticated
    using (
        user_id = (
            select owner_id from public.shop_workers
            where worker_user_id = auth.uid()
            order by created_at asc
            limit 1
        )
    );
