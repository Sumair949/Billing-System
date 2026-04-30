export type BillStatus = "unpaid" | "partial" | "paid";

export type Bill = {
    id: string;
    user_id: string;
    bill_no: string;
    customer_name: string;
    customer_phone: string | null;
    address: string | null;
    email: string | null;
    ntn: string | null;
    stn: string | null;
    bill_date: string;
    received_amount: string;
    total_amount: string;
    freight_charges: string;
    loading_charges: string;
    discount: string;
    prepared_by: string | null;
    approved_by: string | null;
    status: BillStatus;
    created_at: string;
    updated_at: string;
};

export type BillItem = {
    id: string;
    bill_id: string;
    user_id: string;
    sr_no: number;
    description: string;
    quantity: string | null;
    weight: string | null;
    rate: string;
    amount: string;
    created_at: string;
};

export type BillInsert = Omit<
    Bill,
    "id" | "bill_no" | "total_amount" | "status" | "created_at" | "updated_at"
> & {
    bill_no?: string;
    total_amount?: string;
};

export type BillUpdate = Partial<
    Omit<Bill, "id" | "user_id" | "status" | "created_at" | "updated_at">
>;

export type BillItemInsert = Omit<BillItem, "id" | "amount" | "created_at">;

export type Purchase = {
    id: string;
    user_id: string;
    purchase_no: string;
    supplier_name: string;
    purchase_date: string;
    paid_amount: string;
    total_amount: string;
    freight_charges: string;
    loading_charges: string;
    discount: string;
    prepared_by: string | null;
    approved_by: string | null;
    status: BillStatus;
    created_at: string;
    updated_at: string;
};

export type PurchaseItem = {
    id: string;
    purchase_id: string;
    user_id: string;
    sr_no: number;
    description: string;
    quantity: string | null;
    weight: string | null;
    rate: string;
    amount: string;
    created_at: string;
};

export type PurchaseInsert = Omit<
    Purchase,
    "id" | "purchase_no" | "total_amount" | "status" | "created_at" | "updated_at"
> & {
    purchase_no?: string;
    total_amount?: string;
};

export type PurchaseUpdate = Partial<
    Omit<Purchase, "id" | "user_id" | "status" | "created_at" | "updated_at">
>;

export type PurchaseItemInsert = Omit<PurchaseItem, "id" | "amount" | "created_at">;

export type CashReceipt = {
    id: string;
    user_id: string;
    customer_name: string;
    amount: string;
    receipt_date: string;
    notes: string | null;
    created_at: string;
};

export type CashReceiptInsert = {
    user_id: string;
    customer_name: string;
    amount: number;
    receipt_date: string;
    notes?: string | null;
};

export type CashPayment = {
    id: string;
    user_id: string;
    supplier_name: string;
    amount: string;
    payment_date: string;
    notes: string | null;
    created_at: string;
};

export type CashPaymentInsert = {
    user_id: string;
    supplier_name: string;
    amount: number;
    payment_date: string;
    notes?: string | null;
};

type EmptyRecord = Record<string, never>;

export type Database = {
    public: {
        Tables: {
            bills: {
                Row: Bill;
                Insert: BillInsert;
                Update: BillUpdate;
                Relationships: [];
            };
            bill_items: {
                Row: BillItem;
                Insert: BillItemInsert;
                Update: Partial<BillItemInsert>;
                Relationships: [];
            };
            purchases: {
                Row: Purchase;
                Insert: PurchaseInsert;
                Update: PurchaseUpdate;
                Relationships: [];
            };
            purchase_items: {
                Row: PurchaseItem;
                Insert: PurchaseItemInsert;
                Update: Partial<PurchaseItemInsert>;
                Relationships: [];
            };
            cash_receipts: {
                Row: CashReceipt;
                Insert: CashReceiptInsert;
                Update: Partial<CashReceiptInsert>;
                Relationships: [];
            };
            cash_payments: {
                Row: CashPayment;
                Insert: CashPaymentInsert;
                Update: Partial<CashPaymentInsert>;
                Relationships: [];
            };
        };
        Views: EmptyRecord;
        Functions: {
            bill_stats: {
                Args: Record<string, never>;
                Returns: {
                    total_count: number;
                    total_revenue: string;
                    outstanding: string;
                    this_month_count: number;
                };
            };
            customer_pendings: {
                Args: Record<string, never>;
                Returns: Array<{
                    customer_name: string;
                    bill_count: number;
                    total_amount: string;
                    received_amount: string;
                    pending_amount: string;
                }>;
            };
            purchase_stats: {
                Args: Record<string, never>;
                Returns: {
                    total_count: number;
                    total_spend: string;
                    outstanding: string;
                    this_month_count: number;
                };
            };
            supplier_payables: {
                Args: Record<string, never>;
                Returns: Array<{
                    supplier_name: string;
                    purchase_count: number;
                    total_amount: string;
                    paid_amount: string;
                    payable_amount: string;
                }>;
            };
        };
        Enums: EmptyRecord;
        CompositeTypes: EmptyRecord;
    };
};

export function deriveStatus(bill: {
    total_amount: string | number;
    received_amount: string | number;
}): BillStatus {
    const total = Number(bill.total_amount);
    const received = Number(bill.received_amount);
    if (total > 0 && received >= total) return "paid";
    if (received > 0) return "partial";
    return "unpaid";
}
