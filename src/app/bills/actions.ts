"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { billSchema } from "@/lib/validation/bill";

export type BillFormState = {
    error?: string;
    fieldErrors?: Partial<
        Record<
            | "customer_name"
            | "customer_phone"
            | "bill_date"
            | "received_amount"
            | "total_amount"
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
        bill_date: formData.get("bill_date"),
        total_amount: formData.get("total_amount"),
        received_amount: formData.get("received_amount"),
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

export async function createBillAction(
    _prev: BillFormState,
    formData: FormData,
): Promise<BillFormState> {
    const parsed = parseBillFormData(formData);
    if (!parsed.success) {
        return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
    }

    const { supabase, user } = await requireUser();

    // Insert the bill shell first. bill_no is assigned by the DB trigger.
    // total_amount starts at 0 and the bill_items trigger updates it once
    // items are inserted.
    const { data: bill, error: billErr } = await supabase
        .from("bills")
        .insert({
            user_id: user.id,
            customer_name: parsed.data.customer_name,
            customer_phone: parsed.data.customer_phone ?? null,
            bill_date: parsed.data.bill_date,
            total_amount: parsed.data.total_amount,
            received_amount: parsed.data.received_amount,
        })
        .select("id")
        .single();

    if (billErr || !bill) {
        console.error("[createBillAction] insert bill failed:", billErr);
        return { error: "Could not save the bill. Please try again." };
    }

    const { error: itemsErr } = await supabase.from("bill_items").insert(
        parsed.data.items.map((item, i) => ({
            bill_id: bill.id,
            user_id: user.id,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (itemsErr) {
        console.error("[createBillAction] insert items failed:", itemsErr);
        // Compensate — remove the bill so we don't leave an empty shell.
        await supabase.from("bills").delete().eq("id", bill.id);
        return { error: "Could not save the bill's items. Please try again." };
    }

    revalidatePath("/");
    revalidatePath("/bills");
    revalidatePath("/pendings");
    if (formData.get("action") === "save-print") {
        redirect(`/print/bills/${bill.id}`);
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

    const { supabase, user } = await requireUser();

    const { error: billErr } = await supabase
        .from("bills")
        .update({
            customer_name: parsed.data.customer_name,
            customer_phone: parsed.data.customer_phone ?? null,
            bill_date: parsed.data.bill_date,
            total_amount: parsed.data.total_amount,
            received_amount: parsed.data.received_amount,
        })
        .eq("id", id);

    if (billErr) {
        console.error("[updateBillAction] update bill failed:", billErr);
        return { error: "Could not update the bill. Please try again." };
    }

    // Replace line items. Simpler than diffing — the table is small per bill.
    const { error: deleteErr } = await supabase
        .from("bill_items")
        .delete()
        .eq("bill_id", id);

    if (deleteErr) {
        console.error("[updateBillAction] delete items failed:", deleteErr);
        return { error: "Could not update the bill's items. Please try again." };
    }

    const { error: insertErr } = await supabase.from("bill_items").insert(
        parsed.data.items.map((item, i) => ({
            bill_id: id,
            user_id: user.id,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (insertErr) {
        console.error("[updateBillAction] insert items failed:", insertErr);
        return { error: "Could not update the bill's items. Please try again." };
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

    // bill_items cascade via FK `on delete cascade`.
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
    quantity: string;
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
