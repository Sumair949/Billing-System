import { ChevronLeft, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount, formatDate } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deriveStatus, type Bill } from "@/lib/supabase/types";

type BillRow = Pick<
    Bill,
    | "id"
    | "bill_no"
    | "customer_name"
    | "bill_date"
    | "total_amount"
    | "received_amount"
    | "created_at"
>;

function readShopName(meta: Record<string, unknown> | undefined): string {
    const v = meta?.shop_name;
    return typeof v === "string" ? v : "";
}

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    const [userRes, billsRes] = await Promise.all([
        admin.auth.admin.getUserById(id),
        admin
            .from("bills")
            .select(
                "id, bill_no, customer_name, bill_date, total_amount, received_amount, created_at",
            )
            .eq("user_id", id)
            .order("created_at", { ascending: false }),
    ]);

    if (userRes.error || !userRes.data.user) {
        notFound();
    }

    const user = userRes.data.user;
    const bills = (billsRes.data ?? []) as BillRow[];
    const isAdmin = isAdminEmail(user.email);
    const shopName = readShopName(user.user_metadata);

    const totalRevenue = bills.reduce(
        (sum, b) => sum + (Number(b.total_amount) || 0),
        0,
    );
    const outstanding = bills.reduce(
        (sum, b) =>
            sum +
            Math.max(0, (Number(b.total_amount) || 0) - (Number(b.received_amount) || 0)),
        0,
    );

    return (
        <section className="space-y-8">
            <div>
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to users
                </Link>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                {shopName || (
                                    <span className="italic text-muted-foreground">
                                        (no shop name)
                                    </span>
                                )}
                            </h1>
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Admin
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" aria-hidden />
                            {user.email}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total bills" value={bills.length.toLocaleString()} />
                <StatCard label="Total revenue" value={formatAmount(totalRevenue)} />
                <StatCard
                    label="Outstanding"
                    value={formatAmount(outstanding)}
                    emphasis={outstanding > 0 ? "warning" : undefined}
                />
            </div>

            <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                <div className="border-b border-border p-5">
                    <h2 className="text-base font-semibold text-foreground">
                        Bills (read-only)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {bills.length === 0
                            ? "This user has no bills yet."
                            : `${bills.length.toLocaleString()} record${bills.length === 1 ? "" : "s"}`}
                    </p>
                </div>

                {bills.length === 0 ? (
                    <div className="p-16 text-center text-sm text-muted-foreground">
                        Nothing to show yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold">Bill no.</th>
                                    <th className="px-6 py-3.5 font-semibold">Customer</th>
                                    <th className="px-6 py-3.5 font-semibold">Date</th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        Total
                                    </th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        Pending
                                    </th>
                                    <th className="px-6 py-3.5 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {bills.map((bill) => {
                                    const pending = Math.max(
                                        0,
                                        Number(bill.total_amount) -
                                            Number(bill.received_amount),
                                    );
                                    return (
                                        <tr key={bill.id} className="hover:bg-muted/40">
                                            <td className="px-6 py-4 font-mono text-[13px] font-semibold text-foreground">
                                                {bill.bill_no}
                                            </td>
                                            <td className="px-6 py-4 text-foreground/85">
                                                {bill.customer_name}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {formatDate(bill.bill_date)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums">
                                                {formatAmount(bill.total_amount)}
                                            </td>
                                            <td
                                                className={[
                                                    "px-6 py-4 text-right font-mono font-semibold tabular-nums",
                                                    pending > 0
                                                        ? "text-amber-700"
                                                        : "text-muted-foreground",
                                                ].join(" ")}
                                            >
                                                {formatAmount(pending)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={deriveStatus(bill)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}

function StatCard({
    label,
    value,
    emphasis,
}: {
    label: string;
    value: string;
    emphasis?: "warning";
}) {
    const bg =
        emphasis === "warning"
            ? "bg-amber-600 text-white"
            : "bg-header text-header-foreground";
    const labelColor =
        emphasis === "warning" ? "text-white/80" : "text-header-foreground/70";
    return (
        <div className={`rounded-lg p-5 shadow-sm ${bg}`}>
            <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {value}
            </p>
        </div>
    );
}
