-- Purchase counters for auto-numbering (PO-00001, PO-00002, …)
create table if not exists public.purchase_counters (
    user_id uuid primary key references auth.users(id) on delete cascade,
    last_no  integer not null default 0
);

alter table public.purchase_counters enable row level security;
create policy "purchase_counters_own" on public.purchase_counters
    using (auth.uid() = user_id);

-- Purchases (buying records)
create table if not exists public.purchases (
    id            uuid        primary key default gen_random_uuid(),
    user_id       uuid        not null references auth.users(id) on delete cascade,
    purchase_no   text        not null,
    supplier_name text        not null,
    purchase_date date        not null,
    total_amount  numeric(14,2) not null default 0,
    paid_amount   numeric(14,2) not null default 0,
    status        text generated always as (
        case
            when total_amount > 0 and paid_amount >= total_amount then 'paid'
            when paid_amount  > 0                                  then 'partial'
            else 'unpaid'
        end
    ) stored,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index on public.purchases (user_id, purchase_date);
create index on public.purchases (user_id, status);

alter table public.purchases enable row level security;
create policy "purchases_own" on public.purchases
    using (auth.uid() = user_id);

-- Purchase line items
create table if not exists public.purchase_items (
    id          uuid        primary key default gen_random_uuid(),
    purchase_id uuid        not null references public.purchases(id) on delete cascade,
    user_id     uuid        not null references auth.users(id) on delete cascade,
    sr_no       integer     not null,
    description text        not null,
    quantity    numeric(12,3) not null,
    weight      text,
    rate        numeric(14,2) not null,
    amount      numeric(14,2) generated always as (quantity * rate) stored,
    created_at  timestamptz not null default now()
);

alter table public.purchase_items enable row level security;
create policy "purchase_items_own" on public.purchase_items
    using (auth.uid() = user_id);

-- Auto-number trigger: atomically increments the counter and assigns PO-XXXXX
create or replace function public.assign_purchase_no()
returns trigger language plpgsql security definer as $$
declare
    next_no integer;
begin
    insert into public.purchase_counters(user_id, last_no)
    values (new.user_id, 1)
    on conflict (user_id) do update
        set last_no = purchase_counters.last_no + 1
    returning last_no into next_no;
    new.purchase_no := 'PO-' || lpad(next_no::text, 5, '0');
    return new;
end;
$$;

create trigger purchase_no_trigger
    before insert on public.purchases
    for each row execute function public.assign_purchase_no();

-- Overall purchase stats for the KPI cards
create or replace function public.purchase_stats()
returns table(
    total_count       bigint,
    total_spend       text,
    outstanding       text,
    this_month_count  bigint
) language sql security definer as $$
    select
        count(*)::bigint,
        coalesce(sum(total_amount), 0)::text,
        coalesce(sum(greatest(total_amount - paid_amount, 0)), 0)::text,
        count(*) filter (
            where date_trunc('month', purchase_date::timestamptz)
                = date_trunc('month', now())
        )::bigint
    from public.purchases
    where user_id = auth.uid()
      and total_amount > 0;
$$;

-- Supplier payables grouped view (mirror of customer_pendings)
create or replace function public.supplier_payables()
returns table(
    supplier_name   text,
    purchase_count  bigint,
    total_amount    text,
    paid_amount     text,
    payable_amount  text
) language sql security definer as $$
    select
        supplier_name,
        count(*)::bigint                         as purchase_count,
        sum(total_amount)::text                  as total_amount,
        sum(paid_amount)::text                   as paid_amount,
        sum(total_amount - paid_amount)::text    as payable_amount
    from public.purchases
    where user_id    = auth.uid()
      and total_amount > 0
      and paid_amount  < total_amount
    group by supplier_name
    having sum(total_amount - paid_amount) > 0
    order by sum(total_amount - paid_amount) desc;
$$;
