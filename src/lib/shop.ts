export type ShopInfo = {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
};

function readString(meta: Record<string, unknown> | undefined, key: string): string | null {
    const v = meta?.[key];
    return typeof v === "string" && v.trim().length > 0 ? v : null;
}

export function readShopInfo(meta: Record<string, unknown> | undefined): ShopInfo {
    return {
        name: readString(meta, "shop_name") ?? "Steel Shop",
        address: readString(meta, "shop_address"),
        phone: readString(meta, "shop_phone"),
        email: readString(meta, "shop_email"),
    };
}
