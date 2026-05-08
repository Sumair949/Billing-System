"use server";

import { revalidatePath } from "next/cache";
import { groupValuesBy } from "@/lib/group-by";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupplierPurchase = {
    id: string;
    purchase_no: string;
    purchase_date: string;
    total_amount: string;
    paid_amount: string;
    items: {
        sr_no: number;
        description: string;
        quantity: string | null;
        weight: string | null;
        rate: string;
        amount: string;
    }[];
};

export async function getSupplierPurchasesAction(
    supplierName: string,
): Promise<SupplierPurchase[]> {
    const supabase = await createSupabaseServerClient();

    const { data: purchases, error } = await supabase
        .from("purchases")
        .select("id, purchase_no, purchase_date, total_amount, paid_amount")
        .eq("supplier_name", supplierName)
        .gt("total_amount", "0")
        .order("created_at", { ascending: false });

    if (error || !purchases || purchases.length === 0) return [];

    const purchaseIds = purchases.map((p) => p.id);
    const { data: allItems } = await supabase
        .from("purchase_items")
        .select("purchase_id, sr_no, description, quantity, weight, rate, amount")
        .in("purchase_id", purchaseIds)
        .order("purchase_id")
        .order("sr_no");

    const itemsByPurchase = groupValuesBy(allItems ?? [], "purchase_id", (item) => ({
        sr_no: item.sr_no,
        description: item.description,
        quantity: item.quantity,
        weight: item.weight,
        rate: item.rate,
        amount: item.amount,
    }));

    return purchases.map((p) => ({
        id: p.id,
        purchase_no: p.purchase_no,
        purchase_date: p.purchase_date,
        total_amount: p.total_amount,
        paid_amount: p.paid_amount,
        items: itemsByPurchase.get(p.id) ?? [],
    }));
}

export async function recordCashPaymentAction(
    supplierName: string,
    amount: number,
    paymentDate: string,
    notes?: string,
): Promise<{ error?: string }> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    if (checkRateLimit(user.id, "cash_payment", 10))
        return { error: "Too many requests. Please wait a moment and try again." };

    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Amount must be greater than zero." };
    }

    const { error } = await supabase.rpc("apply_cash_payment", {
        p_supplier_name: supplierName,
        p_amount: amount,
        p_payment_date: paymentDate,
        p_notes: notes ?? null,
    });

    if (error) {
        return {
            error: error.code === "P0001"
                ? error.message
                : "Could not record payment. Please try again.",
        };
    }

    revalidatePath("/payables");
    revalidatePath("/purchases");
    return {};
}
