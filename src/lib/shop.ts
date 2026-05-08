import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ShopInfo = {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    ntn: string | null;
    stn: string | null;
    watermark_url: string | null;
};

function readString(meta: Record<string, unknown> | undefined, key: string): string | null {
    const v = meta?.[key];
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length > 0 && s !== "null" ? s : null;
}

export function readShopInfo(meta: Record<string, unknown> | undefined): ShopInfo {
    return {
        name: readString(meta, "shop_name") ?? "Steel Shop",
        address: readString(meta, "shop_address"),
        phone: readString(meta, "shop_phone"),
        email: readString(meta, "shop_email"),
        ntn: readString(meta, "shop_ntn"),
        stn: readString(meta, "shop_stn"),
        watermark_url: readString(meta, "shop_watermark_url"),
    };
}

// For worker sessions, fetches the owner's shop info via the admin client.
// For owner sessions, falls back to readShopInfo from their own metadata.
export async function fetchShopInfo(user: User | null): Promise<ShopInfo> {
    if (!user) return readShopInfo(undefined);

    const role = user.user_metadata?.role as string | undefined;
    if (role === "worker") {
        const ownerId = user.user_metadata?.owner_id as string | undefined;
        if (ownerId) {
            const admin = createSupabaseAdminClient();
            const { data } = await admin.auth.admin.getUserById(ownerId);
            if (data?.user) return readShopInfo(data.user.user_metadata as Record<string, unknown>);
        }
    }

    return readShopInfo(user.user_metadata as Record<string, unknown>);
}
