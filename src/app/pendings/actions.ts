"use server";

import { revalidatePath } from "next/cache";
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
        quantity: string | null;
        weight: string | null;
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
        .select("bill_id, sr_no, description, quantity, weight, rate, amount")
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
            weight: item.weight,
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

export async function recordCashReceiptAction(
    customerName: string,
    amount: number,
    receiptDate: string,
    notes?: string,
): Promise<{ error?: string }> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Amount must be greater than zero." };
    }

    // Pull this customer's bills (oldest first) for validation + FIFO application.
    const { data: bills, error: billsError } = await supabase
        .from("bills")
        .select("id, total_amount, received_amount")
        .eq("customer_name", customerName)
        .gt("total_amount", "0")
        .order("bill_date", { ascending: true })
        .order("created_at", { ascending: true });

    if (billsError) return { error: billsError.message };

    const totalPending = (bills ?? []).reduce(
        (sum, b) =>
            sum + Math.max(0, Number(b.total_amount) - Number(b.received_amount)),
        0,
    );

    if (amount > totalPending + 0.005) {
        return {
            error: `Amount exceeds outstanding balance of Rs ${totalPending.toFixed(2)}.`,
        };
    }

    // Audit row for the ledger.
    const { error: insertError } = await supabase.from("cash_receipts").insert({
        user_id: user.id,
        customer_name: customerName,
        amount,
        receipt_date: receiptDate,
        notes: notes || null,
    });
    if (insertError) return { error: insertError.message };

    // Apply FIFO to oldest pending bills, updating received_amount in-place.
    let remaining = amount;
    for (const bill of bills ?? []) {
        if (remaining <= 0) break;
        const billPending = Math.max(
            0,
            Number(bill.total_amount) - Number(bill.received_amount),
        );
        if (billPending <= 0) continue;
        const apply = Math.min(remaining, billPending);
        const newReceived = Number(bill.received_amount) + apply;
        const { error: updateError } = await supabase
            .from("bills")
            .update({ received_amount: String(newReceived) })
            .eq("id", bill.id);
        if (updateError) return { error: updateError.message };
        remaining -= apply;
    }

    revalidatePath("/pendings");
    revalidatePath("/bills");
    return {};
}
