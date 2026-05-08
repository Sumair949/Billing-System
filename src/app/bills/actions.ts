"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { billSchema } from "@/lib/validation/bill";

export type BillFormState = {
    error?: string;
    fieldErrors?: Partial<
        Record<
            | "customer_name"
            | "customer_phone"
            | "address"
            | "email"
            | "ntn"
            | "stn"
            | "bill_date"
            | "received_amount"
            | "total_amount"
            | "freight_charges"
            | "loading_charges"
            | "labour_charges"
            | "discount"
            | "prepared_by"
            | "approved_by"
            | "items",
            string
        >
    >;
};

function parseBillFormData(formData: FormData) {
    const rawItems = formData.get("items");
    let items: unknown = [];
    if (typeof rawItems === "string" && rawItems.length > 0) {
        try {
            items = JSON.parse(rawItems);
        } catch {
            items = null;
        }
    }

    return billSchema.safeParse({
        customer_name: formData.get("customer_name"),
        customer_phone: formData.get("customer_phone"),
        address: formData.get("address"),
        email: formData.get("email"),
        ntn: formData.get("ntn"),
        stn: formData.get("stn"),
        bill_date: formData.get("bill_date"),
        total_amount: formData.get("total_amount"),
        received_amount: formData.get("received_amount"),
        freight_charges: formData.get("freight_charges"),
        loading_charges: formData.get("loading_charges"),
        labour_charges: formData.get("labour_charges"),
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
): BillFormState["fieldErrors"] {
    const out: BillFormState["fieldErrors"] = {};
    for (const issue of issues) {
        const first = issue.path[0];
        if (typeof first !== "string") continue;
        const key = first as keyof NonNullable<BillFormState["fieldErrors"]>;
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

function billRpcPayload(d: ReturnType<typeof parseBillFormData> & { success: true }) {
    return {
        p_bill: {
            customer_name:   d.data.customer_name,
            customer_phone:  d.data.customer_phone  ?? "",
            address:         d.data.address         ?? "",
            email:           d.data.email           ?? "",
            ntn:             d.data.ntn             ?? "",
            stn:             d.data.stn             ?? "",
            bill_date:       d.data.bill_date,
            total_amount:    d.data.total_amount,
            received_amount: d.data.received_amount,
            freight_charges: d.data.freight_charges,
            loading_charges: d.data.loading_charges,
            labour_charges:  d.data.labour_charges,
            discount:        d.data.discount,
            prepared_by:     d.data.prepared_by     ?? "",
            approved_by:     d.data.approved_by     ?? "",
        },
        p_items: d.data.items.map((item) => ({
            description: item.description,
            quantity:    item.quantity ?? null,
            weight:      item.weight   ?? null,
            rate:        item.rate,
        })),
    };
}

export async function createBillAction(
    _prev: BillFormState,
    formData: FormData,
): Promise<BillFormState> {
    const parsed = parseBillFormData(formData);
    if (!parsed.success) {
        return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
    }

    const { supabase, user } = await requireUser();
    if (checkRateLimit(user.id, "create_bill", 20))
        return { error: "Too many requests. Please wait a moment and try again." };
    const { p_bill, p_items } = billRpcPayload(parsed);

    const { data: billId, error } = await supabase.rpc("create_bill_with_items", {
        p_user_id: user.id,
        p_bill,
        p_items,
    });

    if (error || !billId) {
        console.error("[createBillAction] rpc failed:", error);
        return { error: "Could not save the bill. Please try again." };
    }

    revalidatePath("/");
    revalidatePath("/bills");
    revalidatePath("/pendings");
    if (formData.get("action") === "save-print") {
        redirect(`/print/bills/${billId}`);
    }
    redirect("/?flash=bill-created");
}

export async function updateBillAction(
    id: string,
    _prev: BillFormState,
    formData: FormData,
): Promise<BillFormState> {
    const parsed = parseBillFormData(formData);
    if (!parsed.success) {
        return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
    }

    const { supabase } = await requireUser();
    const { p_bill, p_items } = billRpcPayload(parsed);

    const { error } = await supabase.rpc("upsert_bill_with_items", {
        p_bill_id: id,
        p_bill,
        p_items,
    });

    if (error) {
        console.error("[updateBillAction] rpc failed:", error);
        return { error: "Could not update the bill. Please try again." };
    }

    revalidatePath("/");
    revalidatePath("/bills");
    revalidatePath(`/bills/${id}`);
    revalidatePath("/pendings");
    if (formData.get("action") === "save-print") {
        redirect(`/print/bills/${id}`);
    }
    redirect("/bills?flash=bill-updated");
}

export async function deleteBillAction(id: string) {
    const { supabase } = await requireUser();

    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) {
        console.error("[deleteBillAction] delete failed:", error);
        throw new Error("Could not delete the bill.");
    }

    revalidatePath("/");
    revalidatePath("/bills");
    revalidatePath("/pendings");
    redirect("/bills?flash=bill-deleted");
}

export type BillItemRow = {
    sr_no: number;
    description: string;
    quantity: string | null;
    weight: string | null;
    rate: string;
    amount: string;
};

export async function getBillItemsAction(billId: string): Promise<BillItemRow[]> {
    const { supabase } = await requireUser();
    const { data } = await supabase
        .from("bill_items")
        .select("sr_no, description, quantity, weight, rate, amount")
        .eq("bill_id", billId)
        .order("sr_no");
    return (data ?? []) as BillItemRow[];
}
