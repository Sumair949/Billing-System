"use server";

import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { billSchema } from "@/lib/validation/bill";
import type { BillFormState } from "@/app/bills/actions";

function fieldErrorsFromZod(
    issues: readonly { path: readonly PropertyKey[]; message: string }[],
): BillFormState["fieldErrors"] {
    const out: BillFormState["fieldErrors"] = {};
    for (const issue of issues) {
        const key = issue.path[0] as keyof NonNullable<BillFormState["fieldErrors"]>;
        if (typeof key === "string" && !out[key]) out[key] = issue.message;
    }
    return out;
}

export async function createWorkerBillAction(
    _prev: BillFormState,
    formData: FormData,
): Promise<BillFormState> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const ownerId = user.user_metadata?.owner_id as string | undefined;
    if (!ownerId) redirect("/");
    if (checkRateLimit(user.id, "create_bill", 20))
        return { error: "Too many requests. Please wait a moment and try again." };

    const rawItems = formData.get("items");
    let items: unknown = [];
    if (typeof rawItems === "string" && rawItems.length > 0) {
        try {
            items = JSON.parse(rawItems);
        } catch {
            items = null;
        }
    }

    const parsed = billSchema.safeParse({
        customer_name:   formData.get("customer_name"),
        customer_phone:  formData.get("customer_phone"),
        address:         formData.get("address"),
        email:           formData.get("email"),
        ntn:             formData.get("ntn"),
        stn:             formData.get("stn"),
        bill_date:       formData.get("bill_date"),
        total_amount:    formData.get("total_amount"),
        received_amount: formData.get("received_amount"),
        freight_charges: formData.get("freight_charges"),
        loading_charges: formData.get("loading_charges"),
        labour_charges:  formData.get("labour_charges"),
        discount:        formData.get("discount"),
        prepared_by:     formData.get("prepared_by"),
        approved_by:     formData.get("approved_by"),
        items,
    });

    if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

    const d = parsed.data;

    // create_bill_with_items is security definer and verifies the worker
    // relationship server-side — no admin client needed.
    const { data: billId, error } = await supabase.rpc("create_bill_with_items", {
        p_user_id: ownerId,
        p_bill: {
            customer_name:   d.customer_name,
            customer_phone:  d.customer_phone  ?? "",
            address:         d.address         ?? "",
            email:           d.email           ?? "",
            ntn:             d.ntn             ?? "",
            stn:             d.stn             ?? "",
            bill_date:       d.bill_date,
            total_amount:    d.total_amount,
            received_amount: d.received_amount,
            freight_charges: d.freight_charges,
            loading_charges: d.loading_charges,
            labour_charges:  d.labour_charges,
            discount:        d.discount,
            prepared_by:     d.prepared_by     ?? "",
            approved_by:     d.approved_by     ?? "",
        },
        p_items: d.items.map((item) => ({
            description: item.description,
            quantity:    item.quantity ?? null,
            weight:      item.weight   ?? null,
            rate:        item.rate,
        })),
    });

    if (error || !billId) {
        console.error("[createWorkerBillAction] rpc failed:", error);
        return { error: "Could not save the bill. Please try again." };
    }

    if (formData.get("action") === "save-print") {
        redirect(`/print/bills/${billId}`);
    }
    redirect(`/worker/new-bill?saved=${billId}`);
}
