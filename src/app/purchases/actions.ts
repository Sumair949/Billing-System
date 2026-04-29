"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { purchaseSchema } from "@/lib/validation/purchase";

export type PurchaseFormState = {
    error?: string;
    fieldErrors?: Partial<
        Record<
            | "supplier_name"
            | "purchase_date"
            | "paid_amount"
            | "total_amount"
            | "freight_charges"
            | "loading_charges"
            | "discount"
            | "prepared_by"
            | "approved_by"
            | "items",
            string
        >
    >;
};

function parsePurchaseFormData(formData: FormData) {
    const rawItems = formData.get("items");
    let items: unknown = [];
    if (typeof rawItems === "string" && rawItems.length > 0) {
        try {
            items = JSON.parse(rawItems);
        } catch {
            items = null;
        }
    }
    return purchaseSchema.safeParse({
        supplier_name: formData.get("supplier_name"),
        purchase_date: formData.get("purchase_date"),
        total_amount: formData.get("total_amount"),
        paid_amount: formData.get("paid_amount"),
        freight_charges: formData.get("freight_charges"),
        loading_charges: formData.get("loading_charges"),
        discount: formData.get("discount"),
        prepared_by: formData.get("prepared_by"),
        approved_by: formData.get("approved_by"),
        items,
    });
}

function fieldErrorsFromZod(
    issues: readonly {
        readonly path: readonly PropertyKey[];
        readonly message: string;
    }[],
): PurchaseFormState["fieldErrors"] {
    const out: PurchaseFormState["fieldErrors"] = {};
    for (const issue of issues) {
        const first = issue.path[0];
        if (typeof first !== "string") continue;
        const key = first as keyof NonNullable<PurchaseFormState["fieldErrors"]>;
        if (!out[key]) out[key] = issue.message;
    }
    return out;
}

async function requireUser() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    return { supabase, user };
}

export async function createPurchaseAction(
    _prev: PurchaseFormState,
    formData: FormData,
): Promise<PurchaseFormState> {
    const parsed = parsePurchaseFormData(formData);
    if (!parsed.success) {
        return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
    }

    const { supabase, user } = await requireUser();

    const { data: purchase, error: purchaseErr } = await supabase
        .from("purchases")
        .insert({
            user_id: user.id,
            supplier_name: parsed.data.supplier_name,
            purchase_date: parsed.data.purchase_date,
            total_amount: parsed.data.total_amount,
            paid_amount: parsed.data.paid_amount,
            freight_charges: parsed.data.freight_charges,
            loading_charges: parsed.data.loading_charges,
            discount: parsed.data.discount,
            prepared_by: parsed.data.prepared_by ?? null,
            approved_by: parsed.data.approved_by ?? null,
        })
        .select("id")
        .single();

    if (purchaseErr || !purchase) {
        console.error("[createPurchaseAction] insert failed:", purchaseErr);
        return { error: "Could not save the purchase. Please try again." };
    }

    const { error: itemsErr } = await supabase.from("purchase_items").insert(
        parsed.data.items.map((item, i) => ({
            purchase_id: purchase.id,
            user_id: user.id,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (itemsErr) {
        console.error("[createPurchaseAction] insert items failed:", itemsErr);
        await supabase.from("purchases").delete().eq("id", purchase.id);
        return { error: "Could not save the purchase items. Please try again." };
    }

    revalidatePath("/");
    revalidatePath("/purchases");
    revalidatePath("/payables");
    if (formData.get("action") === "save-print") {
        redirect(`/print/purchases/${purchase.id}`);
    }
    redirect("/purchases?flash=purchase-created");
}

export async function updatePurchaseAction(
    id: string,
    _prev: PurchaseFormState,
    formData: FormData,
): Promise<PurchaseFormState> {
    const parsed = parsePurchaseFormData(formData);
    if (!parsed.success) {
        return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
    }

    const { supabase, user } = await requireUser();

    const { error: purchaseErr } = await supabase
        .from("purchases")
        .update({
            supplier_name: parsed.data.supplier_name,
            purchase_date: parsed.data.purchase_date,
            total_amount: parsed.data.total_amount,
            paid_amount: parsed.data.paid_amount,
            freight_charges: parsed.data.freight_charges,
            loading_charges: parsed.data.loading_charges,
            discount: parsed.data.discount,
            prepared_by: parsed.data.prepared_by ?? null,
            approved_by: parsed.data.approved_by ?? null,
        })
        .eq("id", id);

    if (purchaseErr) {
        console.error("[updatePurchaseAction] update failed:", purchaseErr);
        return { error: "Could not update the purchase. Please try again." };
    }

    const { error: deleteErr } = await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", id);

    if (deleteErr) {
        return { error: "Could not update the purchase items. Please try again." };
    }

    const { error: insertErr } = await supabase.from("purchase_items").insert(
        parsed.data.items.map((item, i) => ({
            purchase_id: id,
            user_id: user.id,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (insertErr) {
        return { error: "Could not update the purchase items. Please try again." };
    }

    revalidatePath("/");
    revalidatePath("/purchases");
    revalidatePath(`/purchases/${id}`);
    revalidatePath("/payables");
    if (formData.get("action") === "save-print") {
        redirect(`/print/purchases/${id}`);
    }
    redirect("/purchases?flash=purchase-updated");
}

export async function deletePurchaseAction(id: string) {
    const { supabase } = await requireUser();

    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) {
        console.error("[deletePurchaseAction] delete failed:", error);
        throw new Error("Could not delete the purchase.");
    }

    revalidatePath("/");
    revalidatePath("/purchases");
    revalidatePath("/payables");
    redirect("/purchases?flash=purchase-deleted");
}

export type PurchaseItemRow = {
    sr_no: number;
    description: string;
    quantity: string | null;
    weight: string | null;
    rate: string;
    amount: string;
};

export async function getPurchaseItemsAction(
    purchaseId: string,
): Promise<PurchaseItemRow[]> {
    const { supabase } = await requireUser();
    const { data } = await supabase
        .from("purchase_items")
        .select("sr_no, description, quantity, weight, rate, amount")
        .eq("purchase_id", purchaseId)
        .order("sr_no");
    return (data ?? []) as PurchaseItemRow[];
}
