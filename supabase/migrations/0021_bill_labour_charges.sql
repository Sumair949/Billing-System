-- Add labour_charges to bills table and update both bill RPCs.

alter table public.bills
    add column if not exists labour_charges numeric not null default 0;

-- Recreate create_bill_with_items to include labour_charges
create or replace function public.create_bill_with_items(
    p_user_id uuid,
    p_bill    jsonb,
    p_items   jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_bill_id uuid;
    v_item    jsonb;
    v_sr_no   int := 1;
begin
    if p_user_id <> auth.uid() then
        if not exists (
            select 1 from public.shop_workers
            where worker_user_id = auth.uid()
              and owner_id        = p_user_id
              and is_active       = true
        ) then
            raise exception 'Not authorised to create bills for this user';
        end if;
    end if;

    insert into public.bills (
        user_id,         customer_name,    customer_phone,
        address,         email,            ntn,
        stn,             bill_date,        total_amount,
        received_amount, freight_charges,  loading_charges,
        labour_charges,  discount,         prepared_by,
        approved_by
    ) values (
        p_user_id,
        p_bill->>'customer_name',
        nullif(p_bill->>'customer_phone', ''),
        nullif(p_bill->>'address',        ''),
        nullif(p_bill->>'email',          ''),
        nullif(p_bill->>'ntn',            ''),
        nullif(p_bill->>'stn',            ''),
        (p_bill->>'bill_date')::date,
        (p_bill->>'total_amount')::numeric,
        (p_bill->>'received_amount')::numeric,
        (p_bill->>'freight_charges')::numeric,
        (p_bill->>'loading_charges')::numeric,
        coalesce((p_bill->>'labour_charges')::numeric, 0),
        (p_bill->>'discount')::numeric,
        nullif(p_bill->>'prepared_by',  ''),
        nullif(p_bill->>'approved_by',  '')
    )
    returning id into v_bill_id;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        insert into public.bill_items (
            bill_id, user_id, sr_no, description, quantity, weight, rate
        ) values (
            v_bill_id,
            p_user_id,
            v_sr_no,
            v_item->>'description',
            nullif(v_item->>'quantity', '')::numeric,
            nullif(v_item->>'weight',   '')::numeric,
            (v_item->>'rate')::numeric
        );
        v_sr_no := v_sr_no + 1;
    end loop;

    return v_bill_id;
end;
$$;

-- Recreate upsert_bill_with_items to include labour_charges
create or replace function public.upsert_bill_with_items(
    p_bill_id uuid,
    p_bill    jsonb,
    p_items   jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_item  jsonb;
    v_sr_no int := 1;
begin
    update public.bills set
        customer_name   = p_bill->>'customer_name',
        customer_phone  = nullif(p_bill->>'customer_phone', ''),
        address         = nullif(p_bill->>'address',        ''),
        email           = nullif(p_bill->>'email',          ''),
        ntn             = nullif(p_bill->>'ntn',            ''),
        stn             = nullif(p_bill->>'stn',            ''),
        bill_date       = (p_bill->>'bill_date')::date,
        total_amount    = (p_bill->>'total_amount')::numeric,
        received_amount = (p_bill->>'received_amount')::numeric,
        freight_charges = (p_bill->>'freight_charges')::numeric,
        loading_charges = (p_bill->>'loading_charges')::numeric,
        labour_charges  = coalesce((p_bill->>'labour_charges')::numeric, 0),
        discount        = (p_bill->>'discount')::numeric,
        prepared_by     = nullif(p_bill->>'prepared_by',  ''),
        approved_by     = nullif(p_bill->>'approved_by',  '')
    where id = p_bill_id;

    if not found then
        raise exception 'Bill not found';
    end if;

    delete from public.bill_items where bill_id = p_bill_id;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        insert into public.bill_items (
            bill_id, user_id, sr_no, description, quantity, weight, rate
        ) values (
            p_bill_id,
            auth.uid(),
            v_sr_no,
            v_item->>'description',
            nullif(v_item->>'quantity', '')::numeric,
            nullif(v_item->>'weight',   '')::numeric,
            (v_item->>'rate')::numeric
        );
        v_sr_no := v_sr_no + 1;
    end loop;
end;
$$;
