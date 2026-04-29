import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePurchaseAction, type PurchaseFormState } from "../../actions";
import { PurchaseForm } from "../../purchase-form";

export default async function EditPurchasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    const [purchaseRes, itemsRes] = await Promise.all([
        supabase
            .from("purchases")
            .select(
                "id, purchase_no, supplier_name, purchase_date, total_amount, paid_amount, freight_charges, loading_charges, discount, prepared_by, approved_by",
            )
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("purchase_items")
            .select("sr_no, description, quantity, weight, rate")
            .eq("purchase_id", id)
            .order("sr_no", { ascending: true }),
    ]);

    if (purchaseRes.error || !purchaseRes.data) {
        notFound();
    }

    const purchase = purchaseRes.data;
    const items = (itemsRes.data ?? []).map((it) => ({
        description: it.description,
        quantity: it.quantity != null ? String(it.quantity) : "",
        weight: it.weight != null ? String(it.weight) : "",
        rate: String(it.rate),
    }));

    async function action(state: PurchaseFormState, formData: FormData) {
        "use server";
        return updatePurchaseAction(id, state, formData);
    }

    return (
        <section className="mx-auto w-full max-w-5xl space-y-8">
            <div>
                <Link
                    href="/purchases"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to purchases
                </Link>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    Edit purchase
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Purchase no.{" "}
                    <span className="font-mono font-semibold text-foreground">
                        {purchase.purchase_no}
                    </span>
                </p>
            </div>

            <PurchaseForm
                action={action}
                submitLabel="Save changes"
                defaultValues={{
                    supplier_name: purchase.supplier_name,
                    purchase_date: purchase.purchase_date,
                    total_amount: String(purchase.total_amount),
                    paid_amount: String(purchase.paid_amount),
                    freight_charges: String(purchase.freight_charges ?? "0"),
                    loading_charges: String(purchase.loading_charges ?? "0"),
                    discount: String(purchase.discount ?? "0"),
                    prepared_by: purchase.prepared_by ?? "",
                    approved_by: purchase.approved_by ?? "",
                    items,
                }}
            />
        </section>
    );
}
