-- Steel Shop Billing — derived payment status column for fast filtering.

-- The status was previously derived in JS via `deriveStatus()`. Surfacing it
-- as a STORED generated column lets PostgREST filter on it directly with a
-- value predicate, without the cross-column comparison PostgREST does not
-- expose cleanly. Keeps the value in sync with total_amount / received_amount
-- automatically on every row update (including the bill_items trigger).

alter table public.bills
    add column status text
    generated always as (
        case
            when total_amount > 0 and received_amount >= total_amount then 'paid'
            when received_amount > 0 then 'partial'
            else 'unpaid'
        end
    ) stored;

create index bills_user_status_idx on public.bills (user_id, status);
