-- Standalone cash receipts from customers (not tied to a specific bill).
create table if not exists public.cash_receipts (
    id            uuid          primary key default gen_random_uuid(),
    user_id       uuid          not null references auth.users(id) on delete cascade,
    customer_name text          not null,
    amount        numeric(14,2) not null check (amount > 0),
    receipt_date  date          not null,
    notes         text,
    created_at    timestamptz   not null default now()
);

alter table public.cash_receipts enable row level security;

drop policy if exists "Users manage own cash receipts" on public.cash_receipts;
create policy "Users manage own cash receipts"
    on public.cash_receipts for all
    using  (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Standalone cash payments to suppliers (not tied to a specific purchase).
create table if not exists public.cash_payments (
    id            uuid          primary key default gen_random_uuid(),
    user_id       uuid          not null references auth.users(id) on delete cascade,
    supplier_name text          not null,
    amount        numeric(14,2) not null check (amount > 0),
    payment_date  date          not null,
    notes         text,
    created_at    timestamptz   not null default now()
);

alter table public.cash_payments enable row level security;

drop policy if exists "Users manage own cash payments" on public.cash_payments;
create policy "Users manage own cash payments"
    on public.cash_payments for all
    using  (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Re-create customer_pendings() to subtract standalone cash receipts.
create or replace function public.customer_pendings()
returns table (
    customer_name   text,
    bill_count      bigint,
    total_amount    text,
    received_amount text,
    pending_amount  text
)
security invoker
language sql
stable
set search_path = public
as $$
    select
        b.customer_name,
        count(*)::bigint                                                                              as bill_count,
        sum(b.total_amount)::text                                                                     as total_amount,
        (sum(b.received_amount) + coalesce(cr.cash_total, 0))::text                                  as received_amount,
        greatest(sum(b.total_amount) - sum(b.received_amount) - coalesce(cr.cash_total, 0), 0)::text as pending_amount
    from public.bills b
    left join (
        select customer_name, sum(amount) as cash_total
        from public.cash_receipts
        where user_id = auth.uid()
        group by customer_name
    ) cr on cr.customer_name = b.customer_name
    group by b.customer_name, cr.cash_total
    having greatest(sum(b.total_amount) - sum(b.received_amount) - coalesce(cr.cash_total, 0), 0) > 0
    order by greatest(sum(b.total_amount) - sum(b.received_amount) - coalesce(cr.cash_total, 0), 0) desc;
$$;

grant execute on function public.customer_pendings() to authenticated;

-- Re-create supplier_payables() to subtract standalone cash payments.
create or replace function public.supplier_payables()
returns table (
    supplier_name   text,
    purchase_count  bigint,
    total_amount    text,
    paid_amount     text,
    payable_amount  text
)
security definer
language sql
set search_path = public
as $$
    select
        p.supplier_name,
        count(*)::bigint                                                                               as purchase_count,
        sum(p.total_amount)::text                                                                      as total_amount,
        (sum(p.paid_amount) + coalesce(cp.cash_total, 0))::text                                       as paid_amount,
        greatest(sum(p.total_amount) - sum(p.paid_amount) - coalesce(cp.cash_total, 0), 0)::text      as payable_amount
    from public.purchases p
    left join (
        select supplier_name, sum(amount) as cash_total
        from public.cash_payments
        where user_id = auth.uid()
        group by supplier_name
    ) cp on cp.supplier_name = p.supplier_name
    where p.user_id = auth.uid()
      and p.total_amount > 0
    group by p.supplier_name, cp.cash_total
    having greatest(sum(p.total_amount) - sum(p.paid_amount) - coalesce(cp.cash_total, 0), 0) > 0
    order by greatest(sum(p.total_amount) - sum(p.paid_amount) - coalesce(cp.cash_total, 0), 0) desc;
$$;

grant execute on function public.supplier_payables() to authenticated;
