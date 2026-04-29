-- bill_items: revert weight to numeric, make quantity nullable, update amount formula
alter table public.bill_items drop column amount;
alter table public.bill_items alter column quantity drop not null;
alter table public.bill_items
    alter column weight type numeric(12,3)
    using case when weight ~ '^\d+(\.\d+)?$' then weight::numeric(12,3) else null end;
alter table public.bill_items
    add column amount numeric(14,2) generated always as (
        case when weight is not null then weight * rate
             else coalesce(quantity, 0) * rate
        end
    ) stored;

-- purchase_items: same changes (weight was text from 0010, quantity was not null)
alter table public.purchase_items drop column amount;
alter table public.purchase_items alter column quantity drop not null;
alter table public.purchase_items
    alter column weight type numeric(12,3)
    using case when weight ~ '^\d+(\.\d+)?$' then weight::numeric(12,3) else null end;
alter table public.purchase_items
    add column amount numeric(14,2) generated always as (
        case when weight is not null then weight * rate
             else coalesce(quantity, 0) * rate
        end
    ) stored;

-- Extended customer and charge fields on bills
alter table public.bills
    add column if not exists address         text,
    add column if not exists email           text,
    add column if not exists ntn             text,
    add column if not exists stn             text,
    add column if not exists freight_charges numeric(14,2) not null default 0,
    add column if not exists loading_charges numeric(14,2) not null default 0,
    add column if not exists discount        numeric(14,2) not null default 0,
    add column if not exists prepared_by     text,
    add column if not exists approved_by     text;
