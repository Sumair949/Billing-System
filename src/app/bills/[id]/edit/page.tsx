import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateBillAction, type BillFormState } from "../../actions";
import { BillForm } from "../../bill-form";

export default async function EditBillPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    const [billRes, itemsRes] = await Promise.all([
        supabase
            .from("bills")
            .select(
                "id, bill_no, customer_name, customer_phone, bill_date, total_amount, received_amount",
            )
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("bill_items")
            .select("sr_no, description, quantity, weight, rate")
            .eq("bill_id", id)
            .order("sr_no", { ascending: true }),
    ]);

    if (billRes.error || !billRes.data) {
        notFound();
    }

    const bill = billRes.data;
    const items = (itemsRes.data ?? []).map((it) => ({
        description: it.description,
        quantity: String(it.quantity),
        weight: it.weight != null ? String(it.weight) : "",
        rate: String(it.rate),
    }));

    async function action(state: BillFormState, formData: FormData) {
        "use server";
        return updateBillAction(id, state, formData);
    }

    return (
        <section className="mx-auto w-full max-w-5xl space-y-8">
            <div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to dashboard
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
                    bill_date: bill.bill_date,
                    total_amount: String(bill.total_amount),
                    received_amount: String(bill.received_amount),
                    items,
                }}
            />
        </section>
    );
}
