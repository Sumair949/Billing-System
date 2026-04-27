-- Allow weight to store arbitrary text (e.g. "1.5 kg", "200 mm") instead of
-- being restricted to a numeric value.
alter table public.bill_items
    alter column weight type text using weight::text;
