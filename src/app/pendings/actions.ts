"use server";

import { revalidatePath } from "next/cache";
import { groupValuesBy } from "@/lib/group-by";
import { checkRateLimit } from "@/lib/rate-limit";
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

    const itemsByBill = groupValuesBy(allItems ?? [], "bill_id", (item) => ({
        sr_no: item.sr_no,
        description: item.description,
        quantity: item.quantity,
        weight: item.weight,
        rate: item.rate,
        amount: item.amount,
    }));

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
    if (checkRateLimit(user.id, "cash_receipt", 10))
        return { error: "Too many requests. Please wait a moment and try again." };

    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Amount must be greater than zero." };
    }

    const { error } = await supabase.rpc("apply_cash_receipt", {
        p_customer_name: customerName,
        p_amount: amount,
        p_receipt_date: receiptDate,
        p_notes: notes ?? null,
    });

    if (error) {
        return {
            error: error.code === "P0001"
                ? error.message
                : "Could not record receipt. Please try again.",
        };
    }

    revalidatePath("/pendings");
    revalidatePath("/bills");
    return {};
}
