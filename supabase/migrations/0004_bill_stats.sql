-- Steel Shop Billing — aggregated stats for KPI cards.
-- Returning a single JSON payload lets the app pull all four numbers in one
-- RPC round-trip. Running as SECURITY INVOKER keeps RLS in effect, so each
-- user only aggregates over their own bills.

create or replace function public.bill_stats()
returns json
security invoker
language sql
stable
set search_path = public
as $$
    select json_build_object(
        'total_count', count(*),
        'total_revenue', coalesce(sum(amount), 0)::text,
        'outstanding',  coalesce(sum(amount) filter (where status = 'unpaid'), 0)::text,
        'this_month_count', count(*) filter (
            where created_at >= date_trunc('month', now() at time zone 'utc')
        )
    )
    from public.bills;
$$;

grant execute on function public.bill_stats() to authenticated;
