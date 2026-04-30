"use server";

import { revalidatePath } from "next/cache";
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

    const itemsByPurchase = new Map<string, SupplierPurchase["items"]>();
    for (const item of allItems ?? []) {
        const arr = itemsByPurchase.get(item.purchase_id) ?? [];
        arr.push({
            sr_no: item.sr_no,
            description: item.description,
            quantity: item.quantity,
            weight: item.weight,
            rate: item.rate,
            amount: item.amount,
        });
        itemsByPurchase.set(item.purchase_id, arr);
    }

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

    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "Amount must be greater than zero." };
    }

    const { data: purchases, error: purchasesError } = await supabase
        .from("purchases")
        .select("id, total_amount, paid_amount")
        .eq("supplier_name", supplierName)
        .gt("total_amount", "0")
        .order("purchase_date", { ascending: true })
        .order("created_at", { ascending: true });

    if (purchasesError) return { error: purchasesError.message };

    const totalPayable = (purchases ?? []).reduce(
        (sum, p) =>
            sum + Math.max(0, Number(p.total_amount) - Number(p.paid_amount)),
        0,
    );

    if (amount > totalPayable + 0.005) {
        return {
            error: `Amount exceeds outstanding balance of Rs ${totalPayable.toFixed(2)}.`,
        };
    }

    const { error: insertError } = await supabase.from("cash_payments").insert({
        user_id: user.id,
        supplier_name: supplierName,
        amount,
        payment_date: paymentDate,
        notes: notes || null,
    });
    if (insertError) return { error: insertError.message };

    let remaining = amount;
    for (const purchase of purchases ?? []) {
        if (remaining <= 0) break;
        const pending = Math.max(
            0,
            Number(purchase.total_amount) - Number(purchase.paid_amount),
        );
        if (pending <= 0) continue;
        const apply = Math.min(remaining, pending);
        const newPaid = Number(purchase.paid_amount) + apply;
        const { error: updateError } = await supabase
            .from("purchases")
            .update({ paid_amount: String(newPaid) })
            .eq("id", purchase.id);
        if (updateError) return { error: updateError.message };
        remaining -= apply;
    }

    revalidatePath("/payables");
    revalidatePath("/purchases");
    return {};
}
