import { Ban, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { formatAmount, formatDate } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminFlashToast } from "./flash-toast";
import { DeleteUserButton } from "./delete-user-button";
import { NewUserDialog } from "./new-user-dialog";
import { ToggleUserButton } from "./toggle-user-button";

type UserRow = {
    id: string;
    email: string;
    shop_name: string;
    created_at: string;
    is_admin: boolean;
    is_disabled: boolean;
    bill_count: number;
    total_revenue: number;
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

export default async function AdminUsersPage() {
    await requireAdmin();
    const admin = createSupabaseAdminClient();

    // Fetch users + all bills (service-role bypasses RLS). We aggregate in
    // app code; this is fine for a small-shop-per-owner scale. If this grows
    // to thousands of users, swap in a `admin_user_stats()` RPC.
    const [usersRes, billsRes] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from("bills").select("user_id, total_amount"),
    ]);

    const billsByUser = new Map<string, { count: number; total: number }>();
    for (const b of billsRes.data ?? []) {
        const prev = billsByUser.get(b.user_id) ?? { count: 0, total: 0 };
        prev.count += 1;
        prev.total += Number(b.total_amount) || 0;
        billsByUser.set(b.user_id, prev);
    }

    const users: UserRow[] = (usersRes.data?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? "",
        shop_name: readShopName(u.user_metadata),
        created_at: u.created_at,
        is_admin: isAdminEmail(u.email),
        is_disabled: isBanned(
            (u as { banned_until?: string | null }).banned_until,
        ),
        bill_count: billsByUser.get(u.id)?.count ?? 0,
        total_revenue: billsByUser.get(u.id)?.total ?? 0,
    }));

    users.sort((a, b) => {
        // Admins last so the first thing an admin sees is the list of shop owners.
        if (a.is_admin !== b.is_admin) return a.is_admin ? 1 : -1;
        return b.created_at.localeCompare(a.created_at);
    });

    const totalUsers = users.length;
    const ownerCount = users.filter((u) => !u.is_admin).length;

    return (
        <>
            <Suspense>
                <AdminFlashToast />
            </Suspense>

            <section className="space-y-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Users
                        </h1>
                        <p className="mt-2 text-base text-muted-foreground">
                            Manage shop owners with access to the billing system.
                        </p>
                    </div>
                    <NewUserDialog />
                </header>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard label="Total users" value={totalUsers.toLocaleString()} />
                    <StatCard label="Shop owners" value={ownerCount.toLocaleString()} />
                    <StatCard
                        label="Admins"
                        value={(totalUsers - ownerCount).toLocaleString()}
                    />
                </div>

                <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                    <div className="flex flex-col gap-1 border-b border-border p-5">
                        <h2 className="text-base font-semibold text-foreground">
                            All users
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {totalUsers.toLocaleString()} user
                            {totalUsers === 1 ? "" : "s"}
                        </p>
                    </div>

                    {users.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Shop</th>
                                        <th className="px-6 py-3.5 font-semibold">Email</th>
                                        <th className="px-6 py-3.5 text-right font-semibold">
                                            Bills
                                        </th>
                                        <th className="px-6 py-3.5 text-right font-semibold">
                                            Revenue
                                        </th>
                                        <th className="px-6 py-3.5 font-semibold">Joined</th>
                                        <th className="px-6 py-3.5 text-right font-semibold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map((u) => (
                                        <tr
                                            key={u.id}
                                            className="transition hover:bg-muted/40"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={[
                                                            "font-medium",
                                                            u.is_disabled
                                                                ? "text-muted-foreground line-through"
                                                                : "text-foreground",
                                                        ].join(" ")}
                                                    >
                                                        {u.shop_name || (
                                                            <span className="italic text-muted-foreground">
                                                                (no shop name)
                                                            </span>
                                                        )}
                                                    </span>
                                                    {u.is_admin ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                                                            <ShieldCheck className="h-3 w-3" />
                                                            Admin
                                                        </span>
                                                    ) : null}
                                                    {u.is_disabled ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                                                            <Ban className="h-3 w-3" />
                                                            Disabled
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono tabular-nums">
                                                {u.bill_count.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono tabular-nums">
                                                {formatAmount(u.total_revenue)}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap items-center justify-end gap-4">
                                                    <Link
                                                        href={`/admin/users/${u.id}`}
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" aria-hidden />
                                                        View
                                                    </Link>
                                                    {u.is_admin ? (
                                                        <span className="text-sm text-muted-foreground">
                                                            —
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <ToggleUserButton
                                                                userId={u.id}
                                                                email={u.email}
                                                                shopName={u.shop_name}
                                                                disabled={u.is_disabled}
                                                            />
                                                            <DeleteUserButton
                                                                userId={u.id}
                                                                email={u.email}
                                                                billCount={u.bill_count}
                                                            />
                                                        </>
                                                    )}
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

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-header p-5 text-header-foreground shadow-sm">
            <p className="text-sm font-medium text-header-foreground/70">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {value}
            </p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="p-16 text-center">
            <p className="text-sm text-muted-foreground">
                No users yet. Click <strong>New user</strong> above to create the
                first one.
            </p>
        </div>
    );
}
