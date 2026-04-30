import { ChevronLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { escapeIlike, formatAmount, formatDate } from "@/lib/format";
import { purchaseSearchSchema, PURCHASE_PAGE_SIZE } from "@/lib/validation/purchase";
import { deriveStatus, type Purchase } from "@/lib/supabase/types";
import { PurchaseDetailModal } from "./purchase-detail-modal";
import { DeletePurchaseButton } from "./delete-button";
import { FlashToast } from "./flash-toast";
import { PurchaseStatusFilter } from "./status-filter";

type SearchParams = { q?: string; page?: string; status?: string };

type PurchaseRow = Pick<
    Purchase,
    | "id"
    | "purchase_no"
    | "supplier_name"
    | "purchase_date"
    | "total_amount"
    | "paid_amount"
    | "status"
    | "created_at"
>;

type StatsRow = {
    total_count: number;
    total_spend: string;
    outstanding: string;
    this_month_count: number;
};

export default async function PurchasesPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const raw = await searchParams;
    const parsed = purchaseSearchSchema.safeParse({
        q: raw.q,
        page: raw.page,
        status: raw.status,
    });
    const q = parsed.success ? parsed.data.q : "";
    const page = parsed.success ? parsed.data.page : 1;
    const status = parsed.success ? parsed.data.status : "all";

    const supabase = await createSupabaseServerClient();
    const from = (page - 1) * PURCHASE_PAGE_SIZE;
    const to = from + PURCHASE_PAGE_SIZE - 1;

    let listQuery = supabase
        .from("purchases")
        .select(
            "id, purchase_no, supplier_name, purchase_date, total_amount, paid_amount, status, created_at",
            { count: "exact" },
        );

    if (q) {
        const pattern = `%${escapeIlike(q)}%`;
        listQuery = listQuery.or(
            `purchase_no.ilike.${pattern},supplier_name.ilike.${pattern}`,
        );
    }

    if (status !== "all") {
        listQuery = listQuery.eq("status", status);
    }

    const [listRes, statsRes] = await Promise.all([
        listQuery.order("created_at", { ascending: false }).range(from, to),
        supabase.rpc("purchase_stats"),
    ]);

    if (listRes.error) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                <p className="text-sm font-medium text-destructive">
                    Could not load purchases. Refresh to try again.
                </p>
                <p className="mt-1 text-xs text-destructive/80">
                    {listRes.error.message}
                </p>
            </div>
        );
    }

    const purchases = (listRes.data ?? []) as PurchaseRow[];
    const total = listRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PURCHASE_PAGE_SIZE));
    const statsRaw = Array.isArray(statsRes.data)
        ? (statsRes.data as unknown[])[0]
        : statsRes.data;
    const stats = (statsRaw as StatsRow | null) ?? {
        total_count: 0,
        total_spend: "0",
        outstanding: "0",
        this_month_count: 0,
    };

    return (
        <>
            <Suspense>
                <FlashToast />
            </Suspense>

            <section className="space-y-8">
                <header className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Purchases
                            </h1>
                            <p className="mt-2 text-base text-muted-foreground">
                                Track what you&apos;ve bought, from whom, and what&apos;s still owed.
                            </p>
                        </div>
                        <Link
                            href="/purchases/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            New purchase
                        </Link>
                    </div>
                </header>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total purchases"
                        value={stats.total_count.toLocaleString()}
                    />
                    <StatCard
                        label="Total spend"
                        value={formatAmount(stats.total_spend)}
                    />
                    <StatCard
                        label="Outstanding"
                        value={formatAmount(stats.outstanding)}
                        emphasis={Number(stats.outstanding) > 0 ? "warning" : undefined}
                    />
                    <StatCard
                        label="This month"
                        value={stats.this_month_count.toLocaleString()}
                    />
                </div>

                <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                    <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    All purchases
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {total === 0
                                        ? "No records match your filters"
                                        : `${total.toLocaleString()} record${total === 1 ? "" : "s"}`}
                                </p>
                            </div>
                            <div className="relative w-full sm:w-96">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden
                                />
                                <input
                                    type="search"
                                    name="q"
                                    defaultValue={q}
                                    placeholder="Search supplier or purchase no…"
                                    className="w-full rounded-md bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>
                        <Suspense>
                            <PurchaseStatusFilter />
                        </Suspense>
                    </div>

                    {purchases.length === 0 ? (
                        <div className="p-16 text-center">
                            <p className="text-sm text-muted-foreground">
                                {q || status !== "all"
                                    ? "No purchases match your current filters."
                                    : "Record your first purchase to get started."}
                            </p>
                            {!q && status === "all" ? (
                                <Link
                                    href="/purchases/new"
                                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" aria-hidden />
                                    New purchase
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <div className="max-h-[min(65vh,640px)] overflow-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead className="sticky top-0 z-10 text-left text-[11px] uppercase tracking-wider text-muted-foreground shadow-[inset_0_-1px_0_0_var(--color-border)] [&_th]:bg-[#f1f5f9]">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">Purchase no.</th>
                                            <th className="px-6 py-3.5 font-semibold">Supplier</th>
                                            <th className="px-6 py-3.5 font-semibold">Date</th>
                                            <th className="px-6 py-3.5 text-right font-semibold">Total</th>
                                            <th className="px-6 py-3.5 text-right font-semibold">Payable</th>
                                            <th className="px-6 py-3.5 font-semibold">Status</th>
                                            <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {purchases.map((p) => {
                                            const payable = Math.max(
                                                0,
                                                Number(p.total_amount) - Number(p.paid_amount),
                                            );
                                            return (
                                                <tr key={p.id} className="transition hover:bg-muted/40">
                                                    <td className="px-6 py-4 font-mono text-[13px] font-semibold text-foreground">
                                                        {p.purchase_no}
                                                    </td>
                                                    <td className="px-6 py-4 text-foreground/85">
                                                        {p.supplier_name}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">
                                                        {formatDate(p.purchase_date)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums">
                                                        {formatAmount(p.total_amount)}
                                                    </td>
                                                    <td
                                                        className={[
                                                            "px-6 py-4 text-right font-mono font-semibold tabular-nums",
                                                            payable > 0
                                                                ? "text-amber-700"
                                                                : "text-muted-foreground",
                                                        ].join(" ")}
                                                    >
                                                        {formatAmount(payable)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge
                                                            status={deriveStatus({
                                                                total_amount: p.total_amount,
                                                                received_amount: p.paid_amount,
                                                            })}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-4">
                                                            <PurchaseDetailModal purchase={p} />
                                                            <Link
                                                                href={`/purchases/${p.id}/edit`}
                                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                                            >
                                                                Edit
                                                            </Link>
                                                            <Link
                                                                href={`/print/payables-ledger/${encodeURIComponent(p.supplier_name)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                                            >
                                                                <svg className="h-3.5 w-3.5" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                                                                </svg>
                                                                Ledger
                                                            </Link>
                                                            <DeletePurchaseButton
                                                                id={p.id}
                                                                purchaseNo={p.purchase_no}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 ? (
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    q={q}
                                    status={status}
                                    total={total}
                                />
                            ) : (
                                <div className="border-t border-border bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
                                    Showing all {total.toLocaleString()} record{total === 1 ? "" : "s"}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </>
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

function Pagination({
    page,
    totalPages,
    q,
    status,
    total,
}: {
    page: number;
    totalPages: number;
    q: string;
    status: string;
    total: number;
}) {
    const makeHref = (p: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status !== "all") params.set("status", status);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return qs ? `/purchases?${qs}` : "/purchases";
    };
    const fromN = (page - 1) * PURCHASE_PAGE_SIZE + 1;
    const toN = Math.min(page * PURCHASE_PAGE_SIZE, total);

    return (
        <nav
            className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3 text-xs"
            aria-label="Pagination"
        >
            <span className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{fromN}</span>–
                <span className="font-medium text-foreground">{toN}</span> of{" "}
                <span className="font-medium text-foreground">{total.toLocaleString()}</span>
            </span>
            <div className="flex gap-2">
                {page > 1 ? (
                    <Link href={makeHref(page - 1)} className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border transition hover:bg-muted">
                        Previous
                    </Link>
                ) : null}
                {page < totalPages ? (
                    <Link href={makeHref(page + 1)} className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border transition hover:bg-muted">
                        Next
                    </Link>
                ) : null}
            </div>
        </nav>
    );
}
