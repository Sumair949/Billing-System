"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { billSchema } from "@/lib/validation/bill";
import { purchaseSchema } from "@/lib/validation/purchase";
import type { BillFormState } from "@/app/bills/actions";
import type { PurchaseFormState } from "@/app/purchases/actions";

export type ChangePasswordFormState = {
    error?: string;
    fieldErrors?: { password?: string };
    success?: boolean;
};

function parseBillFormData(formData: FormData) {
    const rawItems = formData.get("items");
    let items: unknown = [];
    if (typeof rawItems === "string" && rawItems.length > 0) {
        try { items = JSON.parse(rawItems); } catch { items = null; }
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
        discount: formData.get("discount"),
        prepared_by: formData.get("prepared_by"),
        approved_by: formData.get("approved_by"),
        items,
    });
}

function parsePurchaseFormData(formData: FormData) {
    const rawItems = formData.get("items");
    let items: unknown = [];
    if (typeof rawItems === "string" && rawItems.length > 0) {
        try { items = JSON.parse(rawItems); } catch { items = null; }
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

function billFieldErrors(
    issues: readonly { path: readonly PropertyKey[]; message: string }[],
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

function purchaseFieldErrors(
    issues: readonly { path: readonly PropertyKey[]; message: string }[],
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

// ─── Password ────────────────────────────────────────────────────────────────

export async function adminChangePasswordAction(
    userId: string,
    _prev: ChangePasswordFormState,
    formData: FormData,
): Promise<ChangePasswordFormState> {
    await requireAdmin();

    const password = formData.get("password");
    if (typeof password !== "string" || password.length < 8)
        return { fieldErrors: { password: "Password must be at least 8 characters." } };
    if (password.length > 128)
        return { fieldErrors: { password: "Password is too long." } };

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) {
        console.error("[adminChangePasswordAction]", error);
        return { error: "Could not update password. Please try again." };
    }

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
}

// ─── Bills ───────────────────────────────────────────────────────────────────

export async function adminCreateBillAction(
    userId: string,
    _prev: BillFormState,
    formData: FormData,
): Promise<BillFormState> {
    await requireAdmin();

    const parsed = parseBillFormData(formData);
    if (!parsed.success) return { fieldErrors: billFieldErrors(parsed.error.issues) };

    const admin = createSupabaseAdminClient();

    const { data: bill, error: billErr } = await admin
        .from("bills")
        .insert({
            user_id: userId,
            customer_name: parsed.data.customer_name,
            customer_phone: parsed.data.customer_phone ?? null,
            address: parsed.data.address ?? null,
            email: parsed.data.email ?? null,
            ntn: parsed.data.ntn ?? null,
            stn: parsed.data.stn ?? null,
            bill_date: parsed.data.bill_date,
            total_amount: parsed.data.total_amount,
            received_amount: parsed.data.received_amount,
            freight_charges: parsed.data.freight_charges,
            loading_charges: parsed.data.loading_charges,
            discount: parsed.data.discount,
            prepared_by: parsed.data.prepared_by ?? null,
            approved_by: parsed.data.approved_by ?? null,
        })
        .select("id")
        .single();

    if (billErr || !bill) {
        console.error("[adminCreateBillAction] insert bill failed:", billErr);
        return { error: "Could not save the bill. Please try again." };
    }

    const { error: itemsErr } = await admin.from("bill_items").insert(
        parsed.data.items.map((item, i) => ({
            bill_id: bill.id,
            user_id: userId,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (itemsErr) {
        console.error("[adminCreateBillAction] insert items failed:", itemsErr);
        await admin.from("bills").delete().eq("id", bill.id);
        return { error: "Could not save the bill items. Please try again." };
    }

    revalidatePath(`/admin/users/${userId}`);
    if (formData.get("action") === "save-print") redirect(`/print/bills/${bill.id}`);
    redirect(`/admin/users/${userId}?flash=bill-created`);
}

export async function adminUpdateBillAction(
    userId: string,
    billId: string,
    _prev: BillFormState,
    formData: FormData,
): Promise<BillFormState> {
    await requireAdmin();

    const parsed = parseBillFormData(formData);
    if (!parsed.success) return { fieldErrors: billFieldErrors(parsed.error.issues) };

    const admin = createSupabaseAdminClient();

    const { error: billErr } = await admin
        .from("bills")
        .update({
            customer_name: parsed.data.customer_name,
            customer_phone: parsed.data.customer_phone ?? null,
            address: parsed.data.address ?? null,
            email: parsed.data.email ?? null,
            ntn: parsed.data.ntn ?? null,
            stn: parsed.data.stn ?? null,
            bill_date: parsed.data.bill_date,
            total_amount: parsed.data.total_amount,
            received_amount: parsed.data.received_amount,
            freight_charges: parsed.data.freight_charges,
            loading_charges: parsed.data.loading_charges,
            discount: parsed.data.discount,
            prepared_by: parsed.data.prepared_by ?? null,
            approved_by: parsed.data.approved_by ?? null,
        })
        .eq("id", billId)
        .eq("user_id", userId);

    if (billErr) {
        console.error("[adminUpdateBillAction] update failed:", billErr);
        return { error: "Could not update the bill. Please try again." };
    }

    await admin.from("bill_items").delete().eq("bill_id", billId);

    const { error: insertErr } = await admin.from("bill_items").insert(
        parsed.data.items.map((item, i) => ({
            bill_id: billId,
            user_id: userId,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (insertErr) return { error: "Could not update the bill items. Please try again." };

    revalidatePath(`/admin/users/${userId}`);
    if (formData.get("action") === "save-print") redirect(`/print/bills/${billId}`);
    redirect(`/admin/users/${userId}?flash=bill-updated`);
}

export async function adminDeleteBillAction(userId: string, billId: string) {
    await requireAdmin();

    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("bills")
        .delete()
        .eq("id", billId)
        .eq("user_id", userId);

    if (error) {
        console.error("[adminDeleteBillAction] delete failed:", error);
        throw new Error("Could not delete the bill.");
    }

    revalidatePath(`/admin/users/${userId}`);
    redirect(`/admin/users/${userId}?flash=bill-deleted`);
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export async function adminCreatePurchaseAction(
    userId: string,
    _prev: PurchaseFormState,
    formData: FormData,
): Promise<PurchaseFormState> {
    await requireAdmin();

    const parsed = parsePurchaseFormData(formData);
    if (!parsed.success) return { fieldErrors: purchaseFieldErrors(parsed.error.issues) };

    const admin = createSupabaseAdminClient();

    const { data: purchase, error: purchaseErr } = await admin
        .from("purchases")
        .insert({
            user_id: userId,
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
        console.error("[adminCreatePurchaseAction] insert failed:", purchaseErr);
        return { error: "Could not save the purchase. Please try again." };
    }

    const { error: itemsErr } = await admin.from("purchase_items").insert(
        parsed.data.items.map((item, i) => ({
            purchase_id: purchase.id,
            user_id: userId,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (itemsErr) {
        console.error("[adminCreatePurchaseAction] insert items failed:", itemsErr);
        await admin.from("purchases").delete().eq("id", purchase.id);
        return { error: "Could not save the purchase items. Please try again." };
    }

    revalidatePath(`/admin/users/${userId}`);
    if (formData.get("action") === "save-print") redirect(`/print/purchases/${purchase.id}`);
    redirect(`/admin/users/${userId}?flash=purchase-created`);
}

export async function adminUpdatePurchaseAction(
    userId: string,
    purchaseId: string,
    _prev: PurchaseFormState,
    formData: FormData,
): Promise<PurchaseFormState> {
    await requireAdmin();

    const parsed = parsePurchaseFormData(formData);
    if (!parsed.success) return { fieldErrors: purchaseFieldErrors(parsed.error.issues) };

    const admin = createSupabaseAdminClient();

    const { error: purchaseErr } = await admin
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
        .eq("id", purchaseId)
        .eq("user_id", userId);

    if (purchaseErr) {
        console.error("[adminUpdatePurchaseAction] update failed:", purchaseErr);
        return { error: "Could not update the purchase. Please try again." };
    }

    await admin.from("purchase_items").delete().eq("purchase_id", purchaseId);

    const { error: insertErr } = await admin.from("purchase_items").insert(
        parsed.data.items.map((item, i) => ({
            purchase_id: purchaseId,
            user_id: userId,
            sr_no: i + 1,
            description: item.description,
            quantity: item.quantity ?? null,
            weight: item.weight ?? null,
            rate: item.rate,
        })),
    );

    if (insertErr) return { error: "Could not update the purchase items. Please try again." };

    revalidatePath(`/admin/users/${userId}`);
    if (formData.get("action") === "save-print") redirect(`/print/purchases/${purchaseId}`);
    redirect(`/admin/users/${userId}?flash=purchase-updated`);
}

export async function adminDeletePurchaseAction(userId: string, purchaseId: string) {
    await requireAdmin();

    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("purchases")
        .delete()
        .eq("id", purchaseId)
        .eq("user_id", userId);

    if (error) {
        console.error("[adminDeletePurchaseAction] delete failed:", error);
        throw new Error("Could not delete the purchase.");
    }

    revalidatePath(`/admin/users/${userId}`);
    redirect(`/admin/users/${userId}?flash=purchase-deleted`);
}

// ─── Watermark ────────────────────────────────────────────────────────────────

export type WatermarkActionState = { error?: string; success?: boolean };

export async function adminUploadWatermarkAction(
    userId: string,
    formData: FormData,
): Promise<WatermarkActionState> {
    await requireAdmin();

    const file = formData.get("watermark");
    if (!(file instanceof File) || file.size === 0)
        return { error: "No file selected." };

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type))
        return { error: "Only JPEG, PNG, WebP, or SVG images are supported." };

    if (file.size > 2 * 1024 * 1024)
        return { error: "Image must be under 2 MB." };

    const admin = createSupabaseAdminClient();

    // Create bucket on first use; ignore if it already exists.
    await admin.storage
        .createBucket("shop-assets", { public: true, fileSizeLimit: 5 * 1024 * 1024 })
        .catch(() => {});

    const buffer = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
        .from("shop-assets")
        .upload(`${userId}/watermark`, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
        console.error("[adminUploadWatermarkAction] upload failed:", uploadErr);
        return { error: "Could not upload watermark. Please try again." };
    }

    const { data: { publicUrl } } = admin.storage
        .from("shop-assets")
        .getPublicUrl(`${userId}/watermark`);

    const url = `${publicUrl}?t=${Date.now()}`;

    const { data: target } = await admin.auth.admin.getUserById(userId);
    const existing = (target?.user?.user_metadata ?? {}) as Record<string, unknown>;
    await admin.auth.admin.updateUserById(userId, {
        user_metadata: { ...existing, shop_watermark_url: url },
    });

    revalidatePath("/", "layout");
    return { success: true };
}

export async function adminRemoveWatermarkAction(
    userId: string,
): Promise<WatermarkActionState> {
    await requireAdmin();

    const admin = createSupabaseAdminClient();

    await admin.storage.from("shop-assets").remove([`${userId}/watermark`]).catch(() => {});

    const { data: target } = await admin.auth.admin.getUserById(userId);
    const existing = (target?.user?.user_metadata ?? {}) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { shop_watermark_url: _removed, ...rest } = existing;
    await admin.auth.admin.updateUserById(userId, { user_metadata: rest });

    revalidatePath("/", "layout");
    return { success: true };
}
