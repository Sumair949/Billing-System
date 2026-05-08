-- apply_cash_receipt: validates the amount against the customer's outstanding
-- balance, records the cash receipt, and distributes it FIFO across unpaid
-- bills — all in one atomic transaction.
--
-- Raises P0001 with a user-readable message when the amount exceeds the
-- outstanding balance so the caller can surface it directly to the user.
create or replace function public.apply_cash_receipt(
    p_customer_name text,
    p_amount        numeric,
    p_receipt_date  date,
    p_notes         text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_total_pending numeric;
    v_bill          record;
    v_apply         numeric;
    v_remaining     numeric;
begin
    -- Compute total outstanding balance for this customer
    select coalesce(sum(greatest(total_amount - received_amount, 0)), 0)
    into   v_total_pending
    from   public.bills
    where  customer_name = p_customer_name
    and    total_amount  > 0;

    if p_amount > v_total_pending + 0.005 then
        raise exception 'Amount exceeds outstanding balance of Rs %.',
            to_char(v_total_pending, 'FM999999990.00')
            using errcode = 'P0001';
    end if;

    -- Audit row
    insert into public.cash_receipts (user_id, customer_name, amount, receipt_date, notes)
    values (auth.uid(), p_customer_name, p_amount, p_receipt_date, p_notes);

    -- FIFO: distribute across oldest unpaid bills, locking rows to prevent
    -- concurrent double-application
    v_remaining := p_amount;
    for v_bill in
        select id, total_amount, received_amount
        from   public.bills
        where  customer_name    = p_customer_name
        and    total_amount     > 0
        and    received_amount  < total_amount
        order  by bill_date asc, created_at asc
        for update
    loop
        exit when v_remaining <= 0;
        v_apply     := least(v_remaining, v_bill.total_amount - v_bill.received_amount);
        update public.bills
        set    received_amount = received_amount + v_apply
        where  id = v_bill.id;
        v_remaining := v_remaining - v_apply;
    end loop;
end;
$$;

grant execute on function public.apply_cash_receipt(text, numeric, date, text) to authenticated;


-- apply_cash_payment: same pattern for supplier payables.
create or replace function public.apply_cash_payment(
    p_supplier_name text,
    p_amount        numeric,
    p_payment_date  date,
    p_notes         text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_total_payable numeric;
    v_purchase      record;
    v_apply         numeric;
    v_remaining     numeric;
begin
    select coalesce(sum(greatest(total_amount - paid_amount, 0)), 0)
    into   v_total_payable
    from   public.purchases
    where  supplier_name = p_supplier_name
    and    total_amount  > 0;

    if p_amount > v_total_payable + 0.005 then
        raise exception 'Amount exceeds outstanding balance of Rs %.',
            to_char(v_total_payable, 'FM999999990.00')
            using errcode = 'P0001';
    end if;

    insert into public.cash_payments (user_id, supplier_name, amount, payment_date, notes)
    values (auth.uid(), p_supplier_name, p_amount, p_payment_date, p_notes);

    v_remaining := p_amount;
    for v_purchase in
        select id, total_amount, paid_amount
        from   public.purchases
        where  supplier_name = p_supplier_name
        and    total_amount  > 0
        and    paid_amount   < total_amount
        order  by purchase_date asc, created_at asc
        for update
    loop
        exit when v_remaining <= 0;
        v_apply     := least(v_remaining, v_purchase.total_amount - v_purchase.paid_amount);
        update public.purchases
        set    paid_amount = paid_amount + v_apply
        where  id = v_purchase.id;
        v_remaining := v_remaining - v_apply;
    end loop;
end;
$$;

grant execute on function public.apply_cash_payment(text, numeric, date, text) to authenticated;
