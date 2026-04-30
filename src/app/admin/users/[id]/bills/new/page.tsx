import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BillFormState } from "@/app/bills/actions";
import { BillForm } from "@/app/bills/bill-form";
import { adminCreateBillAction } from "../../admin-actions";

export default async function AdminNewBillPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id: userId } = await params;

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) notFound();

    const shopName =
        typeof data.user.user_metadata?.shop_name === "string"
            ? data.user.user_metadata.shop_name
            : data.user.email ?? userId;

    async function action(state: BillFormState, formData: FormData) {
        "use server";
        return adminCreateBillAction(userId, state, formData);
    }

    return (
        <section className="mx-auto w-full max-w-5xl space-y-8">
            <div>
                <Link
                    href={`/admin/users/${userId}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to {shopName}
                </Link>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    New bill
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Creating bill on behalf of{" "}
                    <span className="font-semibold text-foreground">{shopName}</span>
                </p>
            </div>

            <BillForm action={action} submitLabel="Save bill" />
        </section>
    );
}
