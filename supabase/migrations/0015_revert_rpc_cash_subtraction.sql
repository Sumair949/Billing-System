-- Cash receipts/payments are now applied directly to bills/purchases (updating
-- received_amount / paid_amount). The RPCs don't need to subtract them separately.
-- Revert to the original logic that computes pending solely from bill columns.

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
        customer_name,
        count(*)::bigint                                           as bill_count,
        sum(total_amount)::text                                    as total_amount,
        sum(received_amount)::text                                 as received_amount,
        sum(greatest(total_amount - received_amount, 0))::text     as pending_amount
    from public.bills
    where greatest(total_amount - received_amount, 0) > 0
    group by customer_name
    order by sum(greatest(total_amount - received_amount, 0)) desc;
$$;

grant execute on function public.customer_pendings() to authenticated;

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

grant execute on function public.supplier_payables() to authenticated;
