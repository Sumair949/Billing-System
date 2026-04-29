-- Switch the auto-generated purchase number from "PO-XXXXX" to "PUR-XXXXX" so
-- the editable "PO No." column on the supplier ledger no longer collides with
-- the system-assigned tracking number.

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
    new.purchase_no := 'PUR-' || lpad(next_no::text, 5, '0');
    return new;
end;
$$;

-- Rename existing rows so old purchases match the new format.
update public.purchases
   set purchase_no = 'PUR-' || substring(purchase_no from 'PO-(\d+)')
 where purchase_no like 'PO-%';
