import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateShopInfoAction, type UpdateShopFormState } from "../../../actions";
import { adminUploadWatermarkAction, adminRemoveWatermarkAction } from "../admin-actions";
import { ShopInfoForm } from "./form";
import { WatermarkSection } from "./watermark-section";

function readMetaString(
    meta: Record<string, unknown> | undefined,
    key: string,
): string {
    const v = meta?.[key];
    return typeof v === "string" ? v : "";
}

export default async function AdminEditShopPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.auth.admin.getUserById(id);
    if (error || !data.user) notFound();

    const user = data.user;
    const meta = user.user_metadata ?? {};

    async function action(state: UpdateShopFormState, formData: FormData) {
        "use server";
        return updateShopInfoAction(id, state, formData);
    }

    async function uploadWatermark(formData: FormData) {
        "use server";
        return adminUploadWatermarkAction(id, formData);
    }

    async function removeWatermark() {
        "use server";
        return adminRemoveWatermarkAction(id);
    }

    const currentWatermarkUrl = readMetaString(meta, "shop_watermark_url") || null;

    return (
        <section className="space-y-6">
            <div>
                <Link
                    href={`/admin/users/${id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to user
                </Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Edit shop info
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {user.email}
                </p>
            </div>

            <div className="max-w-xl space-y-6">
                <ShopInfoForm
                    action={action}
                    cancelHref={`/admin/users/${id}`}
                    defaultValues={{
                        shop_name: readMetaString(meta, "shop_name"),
                        shop_address: readMetaString(meta, "shop_address"),
                        shop_phone: readMetaString(meta, "shop_phone"),
                        shop_email: readMetaString(meta, "shop_email"),
                        shop_ntn: readMetaString(meta, "shop_ntn"),
                        shop_stn: readMetaString(meta, "shop_stn"),
                    }}
                />

                <WatermarkSection
                    currentUrl={currentWatermarkUrl}
                    uploadAction={uploadWatermark}
                    removeAction={removeWatermark}
                />
            </div>
        </section>
    );
}
