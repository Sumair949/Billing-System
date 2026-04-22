-- Steel Shop Billing — customer phone, line-item weight,
-- and user-editable bill totals.

-- 1. Customer phone (nullable — old rows have no phone). We keep it text
--    rather than a numeric type so leading zeros, "+92", spaces, and dashes
--    all round-trip intact.
alter table public.bills
    add column if not exists customer_phone text;

-- 2. Weight per line item (kg, optional). Most steel shops quote both the
--    piece count AND the weight of the bundle — the rate may be per kg or
--    per piece, so weight stays purely informational and does not change
--    the stored `amount` column.
alter table public.bill_items
    add column if not exists weight numeric(12, 3);

-- 3. Make bills.total_amount user-controlled. Previously the trigger
--    `bill_items_update_total` forced it to equal sum(items.amount), which
--    prevented discounts, rounding adjustments, or any manual override.
--    Drop the trigger so the server action owns the value. The trigger
--    function stays in place (harmless if unused) in case we want to
--    reinstate an auto-sum mode later.
drop trigger if exists bill_items_update_total on public.bill_items;
