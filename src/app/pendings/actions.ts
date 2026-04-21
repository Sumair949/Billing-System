"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerBill = {
    id: string;
    bill_no: string;
    bill_date: string;
    total_amount: string;
    received_amount: string;
    items: {
        sr_no: number;
        description: string;
        quantity: string;
        rate: string;
        amount: string;
    }[];
};

export async function getCustomerBillsAction(
    customerName: string,
): Promise<CustomerBill[]> {
    const supabase = await createSupabaseServerClient();

    const { data: bills, error } = await supabase
        .from("bills")
        .select("id, bill_no, bill_date, total_amount, received_amount")
        .eq("customer_name", customerName)
        .gt("total_amount", "0")
        .order("created_at", { ascending: false });

    if (error || !bills || bills.length === 0) return [];

    const billIds = bills.map((b) => b.id);
    const { data: allItems } = await supabase
        .from("bill_items")
        .select("bill_id, sr_no, description, quantity, rate, amount")
        .in("bill_id", billIds)
        .order("bill_id")
        .order("sr_no");

    const itemsByBill = new Map<
        string,
        CustomerBill["items"]
    >();
    for (const item of allItems ?? []) {
        const arr = itemsByBill.get(item.bill_id) ?? [];
        arr.push({
            sr_no: item.sr_no,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
        });
        itemsByBill.set(item.bill_id, arr);
    }

    return bills.map((b) => ({
        id: b.id,
        bill_no: b.bill_no,
        bill_date: b.bill_date,
        total_amount: b.total_amount,
        received_amount: b.received_amount,
        items: itemsByBill.get(b.id) ?? [],
    }));
}
