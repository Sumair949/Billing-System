import { Ban, Eye } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminFlashToast } from "./flash-toast";
import { ToggleUserButton } from "./toggle-user-button";

type ShopRow = {
    id: string;
    email: string;
    shop_name: string;
    created_at: string;
    is_disabled: boolean;
    worker_count: number;
};

function isBanned(bannedUntil: string | null | undefined): boolean {
    if (!bannedUntil) return false;
    const ts = Date.parse(bannedUntil);
    return Number.isFinite(ts) && ts > Date.now();
}

function readShopName(meta: Record<string, unknown> | undefined): string {
    const v = meta?.shop_name;
    return typeof v === "string" ? v : "";
}

export default async function AdminShopsPage() {
    await requireAdmin();
    const admin = createSupabaseAdminClient();

    const [usersRes, workersRes] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
        admin.from("shop_workers").select("owner_id"),
    ]);

    const workerCountByOwner = new Map<string, number>();
    for (const w of workersRes.data ?? []) {
        workerCountByOwner.set(w.owner_id, (workerCountByOwner.get(w.owner_id) ?? 0) + 1);
    }

    const shops: ShopRow[] = (usersRes.data?.users ?? [])
        .filter((u) => !isAdminEmail(u.email) && u.user_metadata?.role !== "worker")
        .map((u) => ({
            id: u.id,
            email: u.email ?? "",
            shop_name: readShopName(u.user_metadata),
            created_at: u.created_at,
            is_disabled: isBanned((u as { banned_until?: string | null }).banned_until),
            worker_count: workerCountByOwner.get(u.id) ?? 0,
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return (
        <>
            <Suspense>
                <AdminFlashToast />
            </Suspense>

            <section className="space-y-8">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shops</h1>
                    <p className="mt-2 text-base text-muted-foreground">
                        {shops.length} shop{shops.length === 1 ? "" : "s"} registered.
                    </p>
                </header>

                <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                    {shops.length === 0 ? (
                        <div className="p-16 text-center text-sm text-muted-foreground">
                            No shops registered yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Shop</th>
                                        <th className="px-6 py-3.5 font-semibold">Email</th>
                                        <th className="px-6 py-3.5 text-right font-semibold">Workers</th>
                                        <th className="px-6 py-3.5 font-semibold">Joined</th>
                                        <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {shops.map((shop) => (
                                        <tr key={shop.id} className="transition hover:bg-muted/40">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={
                                                            shop.is_disabled
                                                                ? "text-muted-foreground line-through"
                                                                : "font-medium text-foreground"
                                                        }
                                                    >
                                                        {shop.shop_name || (
                                                            <span className="italic text-muted-foreground">
                                                                (no shop name)
                                                            </span>
                                                        )}
                                                    </span>
                                                    {shop.is_disabled ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                                                            <Ban className="h-3 w-3" />
                                                            Disabled
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {shop.email}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono tabular-nums">
                                                {shop.worker_count}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {formatDate(shop.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap items-center justify-end gap-4">
                                                    <Link
                                                        href={`/admin/users/${shop.id}`}
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" aria-hidden />
                                                        View
                                                    </Link>
                                                    <ToggleUserButton
                                                        userId={shop.id}
                                                        email={shop.email}
                                                        shopName={shop.shop_name}
                                                        disabled={shop.is_disabled}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
