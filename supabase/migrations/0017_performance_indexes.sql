-- bills: ledger, print, and receivables queries filter by (user_id, customer_name)
create index if not exists bills_user_customer_idx
    on public.bills(user_id, customer_name);

-- purchases: payables, print, and supplier queries filter by (user_id, supplier_name)
create index if not exists purchases_user_supplier_idx
    on public.purchases(user_id, supplier_name);

-- cash_receipts: customer_pendings() and ledger queries filter by (user_id, customer_name)
create index if not exists cash_receipts_user_customer_idx
    on public.cash_receipts(user_id, customer_name);

-- cash_payments: supplier_payables() and ledger queries filter by (user_id, supplier_name)
create index if not exists cash_payments_user_supplier_idx
    on public.cash_payments(user_id, supplier_name);
