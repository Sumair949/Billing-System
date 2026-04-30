import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PurchaseFormState } from "@/app/purchases/actions";
import { PurchaseForm } from "@/app/purchases/purchase-form";
import { adminCreatePurchaseAction } from "../../admin-actions";

export default async function AdminNewPurchasePage({
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

    async function action(state: PurchaseFormState, formData: FormData) {
        "use server";
        return adminCreatePurchaseAction(userId, state, formData);
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
                    New purchase
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Creating purchase on behalf of{" "}
                    <span className="font-semibold text-foreground">{shopName}</span>
                </p>
            </div>

            <PurchaseForm action={action} submitLabel="Save purchase" />
        </section>
    );
}
