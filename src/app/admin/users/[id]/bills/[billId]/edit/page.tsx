import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillFormState } from "@/app/bills/actions";
import { BillForm } from "@/app/bills/bill-form";
import { adminUpdateBillAction } from "../../../admin-actions";

export default async function AdminEditBillPage({
    params,
}: {
    params: Promise<{ id: string; billId: string }>;
}) {
    await requireAdmin();
    const { id: userId, billId } = await params;

    const admin = createSupabaseAdminClient();

    const [billRes, itemsRes] = await Promise.all([
        admin
            .from("bills")
            .select(
                "id, bill_no, customer_name, customer_phone, address, email, ntn, stn, bill_date, total_amount, received_amount, freight_charges, loading_charges, discount, prepared_by, approved_by",
            )
            .eq("id", billId)
            .eq("user_id", userId)
            .maybeSingle(),
        admin
            .from("bill_items")
            .select("sr_no, description, quantity, weight, rate")
            .eq("bill_id", billId)
            .order("sr_no", { ascending: true }),
    ]);

    if (billRes.error || !billRes.data) notFound();

    const bill = billRes.data;
    const items = (itemsRes.data ?? []).map((it) => ({
        description: it.description,
        quantity: it.quantity != null ? String(it.quantity) : "",
        weight: it.weight != null ? String(it.weight) : "",
        rate: String(it.rate),
    }));

    async function action(state: BillFormState, formData: FormData) {
        "use server";
        return adminUpdateBillAction(userId, billId, state, formData);
    }

    return (
        <section className="mx-auto w-full max-w-5xl space-y-8">
            <div>
                <Link
                    href={`/admin/users/${userId}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to user
                </Link>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    Edit bill
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Bill no.{" "}
                    <span className="font-mono font-semibold text-foreground">
                        {bill.bill_no}
                    </span>
                </p>
            </div>

            <BillForm
                action={action}
                submitLabel="Save changes"
                defaultValues={{
                    customer_name: bill.customer_name,
                    customer_phone: bill.customer_phone ?? "",
                    address: bill.address ?? "",
                    email: bill.email ?? "",
                    ntn: bill.ntn ?? "",
                    stn: bill.stn ?? "",
                    bill_date: bill.bill_date,
                    total_amount: String(bill.total_amount),
                    received_amount: String(bill.received_amount),
                    freight_charges: String(bill.freight_charges ?? "0"),
                    loading_charges: String(bill.loading_charges ?? "0"),
                    discount: String(bill.discount ?? "0"),
                    prepared_by: bill.prepared_by ?? "",
                    approved_by: bill.approved_by ?? "",
                    items,
                }}
            />
        </section>
    );
}
