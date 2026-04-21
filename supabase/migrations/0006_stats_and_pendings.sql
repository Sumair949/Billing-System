-- Steel Shop Billing — updated aggregates for the invoice model.

-- Replace bill_stats() to compute revenue + outstanding from the new
-- total_amount / received_amount columns.
create or replace function public.bill_stats()
returns json
security invoker
language sql
stable
set search_path = public
as $$
    select json_build_object(
        'total_count', count(*),
        'total_revenue', coalesce(sum(total_amount), 0)::text,
        'outstanding',
            coalesce(sum(greatest(total_amount - received_amount, 0)), 0)::text,
        'this_month_count', count(*) filter (
            where created_at >= date_trunc('month', now() at time zone 'utc')
        )
    )
    from public.bills;
$$;

grant execute on function public.bill_stats() to authenticated;

-- Per-customer pending totals, used by the /pendings page.
-- Only returns customers who still owe money.
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
