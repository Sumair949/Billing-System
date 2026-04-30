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
