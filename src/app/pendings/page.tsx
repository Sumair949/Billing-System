import { Users, Wallet } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatAmount } from "@/lib/format";
import { CustomerBillsModal } from "./customer-bills-modal";
import { PendingsFilters } from "./filters";

type RpcRow = {
    customer_name: string;
    bill_count: number;
    total_amount: string;
    received_amount: string;
    pending_amount: string;
};

type PendingRow = RpcRow & { bill_nos: string[] };

type SearchParams = { q?: string; pay?: string };

function normalizePay(raw: string | undefined): "all" | "partial" | "unpaid" {
    if (raw === "partial" || raw === "unpaid") return raw;
    return "all";
}

export default async function PendingsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const raw = await searchParams;
    const q = (raw.q ?? "").trim().toLowerCase();
    const pay = normalizePay(raw.pay);

    const supabase = await createSupabaseServerClient();
    const [pendingRes, billNosRes] = await Promise.all([
        supabase.rpc("customer_pendings"),
        supabase
            .from("bills")
            .select("customer_name, bill_no")
            .neq("status", "paid")
            .order("bill_no", { ascending: true }),
    ]);
    const { data, error } = pendingRes;

    if (error) {
        return (
            <section className="space-y-6">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Pendings
                    </h1>
                    <p className="mt-2 text-base text-muted-foreground">
                        Outstanding balances by customer.
                    </p>
                </header>
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                    <p className="text-sm font-medium text-destructive">
                        Could not load pendings.
                    </p>
                    <p className="mt-1 text-xs text-destructive/80">{error.message}</p>
                </div>
            </section>
        );
    }

    const billNosByCustomer = new Map<string, string[]>();
    for (const b of billNosRes.data ?? []) {
        const arr = billNosByCustomer.get(b.customer_name) ?? [];
        arr.push(b.bill_no);
        billNosByCustomer.set(b.customer_name, arr);
    }

    const allRows: PendingRow[] = ((data ?? []) as RpcRow[]).map((r) => ({
        ...r,
        bill_nos: billNosByCustomer.get(r.customer_name) ?? [],
    }));
    const rows = allRows.filter((r) => {
        if (q) {
            const matchName = r.customer_name.toLowerCase().includes(q);
            const matchBillNo = r.bill_nos.some((bn) =>
                bn.toLowerCase().includes(q),
            );
            if (!matchName && !matchBillNo) return false;
        }
        if (pay === "partial" && Number(r.received_amount) <= 0) return false;
        if (pay === "unpaid" && Number(r.received_amount) > 0) return false;
        return true;
    });
    const totalPending = allRows.reduce(
        (sum, r) => sum + Number(r.pending_amount),
        0,
    );
    const customerCount = allRows.length;

    return (
        <section className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Pendings
                </h1>
                <p className="mt-2 text-base text-muted-foreground">
                    Outstanding balances grouped by customer.
                </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                    icon={<Users className="h-4 w-4" />}
                    label="Customers with pending"
                    value={customerCount.toLocaleString()}
                />
                <StatCard
                    icon={<Wallet className="h-4 w-4" />}
                    label="Total outstanding"
                    value={formatAmount(totalPending)}
                    emphasis={totalPending > 0 ? "warning" : undefined}
                />
            </div>

            <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                <div className="flex flex-col gap-4 border-b border-border p-5">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            Customers
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {rows.length === allRows.length
                                ? `${allRows.length.toLocaleString()} customer${allRows.length === 1 ? "" : "s"} with pending balances`
                                : `Showing ${rows.length.toLocaleString()} of ${allRows.length.toLocaleString()}`}
                        </p>
                    </div>
                    <PendingsFilters />
                </div>

                {rows.length === 0 ? (
                    <div className="p-16 text-center text-sm text-muted-foreground">
                        {allRows.length === 0
                            ? "No pendings. Every bill has been paid in full."
                            : "No customers match the current filters."}
                    </div>
                ) : (
                    <div className="max-h-[min(65vh,640px)] overflow-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="sticky top-0 z-10 text-left text-[11px] uppercase tracking-wider text-muted-foreground shadow-[inset_0_-1px_0_0_var(--color-border)] [&_th]:bg-[#f1f5f9]">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold">
                                        Bill no.
                                    </th>
                                    <th className="px-6 py-3.5 font-semibold">Customer</th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        Bills
                                    </th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        Total billed
                                    </th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        Received
                                    </th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        Pending
                                    </th>
                                    <th className="px-6 py-3.5 text-right font-semibold">
                                        View
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {rows.map((r) => {
                                    const shown = r.bill_nos.slice(0, 3);
                                    const extra = r.bill_nos.length - shown.length;
                                    return (
                                    <tr
                                        key={r.customer_name}
                                        className="transition hover:bg-muted/40"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {shown.map((bn) => (
                                                    <span
                                                        key={bn}
                                                        className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground"
                                                    >
                                                        {bn}
                                                    </span>
                                                ))}
                                                {extra > 0 ? (
                                                    <span className="text-[11px] font-medium text-muted-foreground">
                                                        +{extra} more
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {r.customer_name}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                                            {r.bill_count.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono tabular-nums">
                                            {formatAmount(r.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono tabular-nums text-muted-foreground">
                                            {formatAmount(r.received_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums text-amber-700">
                                            {formatAmount(r.pending_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <CustomerBillsModal
                                                customerName={r.customer_name}
                                                pendingAmount={formatAmount(r.pending_amount)}
                                            />
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
    icon,
    label,
    value,
    emphasis,
}: {
    icon: React.ReactNode;
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
            <div className={`flex items-center gap-2 ${labelColor}`}>
                <span
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10"
                    aria-hidden
                >
                    {icon}
                </span>
                <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {value}
            </p>
        </div>
    );
}
