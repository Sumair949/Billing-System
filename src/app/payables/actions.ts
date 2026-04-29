"use server";

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
