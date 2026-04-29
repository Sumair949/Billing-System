-- Mirror the bill extended-fields migration on purchases:
-- charges (freight, loading), discount, and prepared/approved-by signature lines.

alter table public.purchases
    add column if not exists freight_charges numeric(14,2) not null default 0,
    add column if not exists loading_charges numeric(14,2) not null default 0,
    add column if not exists discount        numeric(14,2) not null default 0,
    add column if not exists prepared_by     text,
    add column if not exists approved_by     text;
