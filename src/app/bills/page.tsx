import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { escapeIlike, formatAmount, formatDate } from "@/lib/format";
import {
    PAGE_SIZE,
    searchSchema,
    type DateRange,
    type StatusFilter,
} from "@/lib/validation/bill";
import { deriveStatus, type Bill } from "@/lib/supabase/types";
import { DateRangeFilter } from "./date-range-filter";
import { BillDetailModal } from "./bill-detail-modal";
import { DeleteBillButton } from "./delete-button";
import { FlashToast } from "./flash-toast";
import { SearchForm } from "./search-form";
import { StatusFilterPills } from "./status-filter";

type SearchParams = {
    q?: string;
    page?: string;
    range?: string;
    status?: string;
};

type BillRow = Pick<
    Bill,
    | "id"
    | "bill_no"
    | "customer_name"
    | "customer_phone"
    | "bill_date"
    | "total_amount"
    | "received_amount"
    | "status"
    | "created_at"
>;

type StatsRow = {
    total_count: number;
    total_revenue: string;
    outstanding: string;
    this_month_count: number;
};

function rangeBounds(range: DateRange): { from: Date; to?: Date } | null {
    const now = new Date();
    if (range === "month") {
        return {
            from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        };
    }
    if (range === "last-month") {
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        return { from, to };
    }
    if (range === "last-30") {
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - 30);
        return { from };
    }
    return null;
}

export default async function BillsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const raw = await searchParams;
    const parsed = searchSchema.safeParse({
        q: raw.q,
        page: raw.page,
        range: raw.range,
        status: raw.status,
    });
    const q = parsed.success ? parsed.data.q : "";
    const page = parsed.success ? parsed.data.page : 1;
    const range = parsed.success ? parsed.data.range : "all";
    const status = parsed.success ? parsed.data.status : "all";

    const supabase = await createSupabaseServerClient();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let listQuery = supabase
        .from("bills")
        .select(
            "id, bill_no, customer_name, customer_phone, bill_date, total_amount, received_amount, status, created_at",
            { count: "exact" },
        );

    if (q) {
        const pattern = `%${escapeIlike(q)}%`;
        listQuery = listQuery.or(
            `bill_no.ilike.${pattern},customer_name.ilike.${pattern}`,
        );
    }

    const bounds = rangeBounds(range);
    if (bounds) {
        listQuery = listQuery.gte("created_at", bounds.from.toISOString());
        if (bounds.to) {
            listQuery = listQuery.lt("created_at", bounds.to.toISOString());
        }
    }

    if (status !== "all") {
        listQuery = listQuery.eq("status", status);
    }

    const [listRes, statsRes] = await Promise.all([
        listQuery.order("created_at", { ascending: false }).range(from, to),
        supabase.rpc("bill_stats"),
    ]);

    if (listRes.error) {
        return (
            <ErrorState
                message="Could not load bills. Refresh to try again."
                detail={listRes.error.message}
            />
        );
    }

    const bills = (listRes.data ?? []) as BillRow[];
    const total = listRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const stats = (statsRes.data as StatsRow | null) ?? {
        total_count: 0,
        total_revenue: "0",
        outstanding: "0",
        this_month_count: 0,
    };

    return (
        <>
            <Suspense>
                <FlashToast />
            </Suspense>

            <section className="space-y-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Bills
                        </h1>
                        <p className="mt-2 text-base text-muted-foreground">
                            Track, search, and manage your shop&apos;s billing records.
                        </p>
                    </div>
                    <Link
                        href="/bills/new"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        New bill
                    </Link>
                </header>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total bills"
                        value={stats.total_count.toLocaleString()}
                    />
                    <StatCard
                        label="Total revenue"
                        value={formatAmount(stats.total_revenue)}
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
                                    All bills
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
                                <SearchForm className="pl-9" />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <DateRangeFilter />
                            <StatusFilterPills />
                        </div>
                    </div>

                    {bills.length === 0 ? (
                        <EmptyState q={q} range={range} status={status} />
                    ) : (
                        <>
                            <div className="max-h-[min(65vh,640px)] overflow-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead className="sticky top-0 z-10 text-left text-[11px] uppercase tracking-wider text-muted-foreground shadow-[inset_0_-1px_0_0_var(--color-border)] [&_th]:bg-[#f1f5f9]">
                                        <tr>
                                            <th className="px-6 py-3.5 font-semibold">
                                                Bill no.
                                            </th>
                                            <th className="px-6 py-3.5 font-semibold">
                                                Customer
                                            </th>
                                            <th className="px-6 py-3.5 font-semibold">
                                                Date
                                            </th>
                                            <th className="px-6 py-3.5 text-right font-semibold">
                                                Total
                                            </th>
                                            <th className="px-6 py-3.5 text-right font-semibold">
                                                Pending
                                            </th>
                                            <th className="px-6 py-3.5 font-semibold">
                                                Status
                                            </th>
                                            <th className="px-6 py-3.5 text-right font-semibold">
                                                Actions
                                            </th>
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
                                                <tr
                                                    key={bill.id}
                                                    className="transition hover:bg-muted/40"
                                                >
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
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-4">
                                                            <BillDetailModal
                                                                bill={bill}
                                                            />
                                                            <Link
                                                                href={`/bills/${bill.id}/edit`}
                                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                                            >
                                                                Edit
                                                            </Link>
                                                            <DeleteBillButton
                                                                id={bill.id}
                                                                billNo={bill.bill_no}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                q={q}
                                range={range}
                                status={status}
                                total={total}
                            />
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

function EmptyState({
    q,
    range,
    status,
}: {
    q: string;
    range: DateRange;
    status: StatusFilter;
}) {
    const hasFilters = q || range !== "all" || status !== "all";
    return (
        <div className="p-16 text-center">
            {hasFilters ? (
                <p className="text-sm text-muted-foreground">
                    No bills match your current filters.
                </p>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        Create your first bill to get started.
                    </p>
                    <Link
                        href="/bills/new"
                        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        New bill
                    </Link>
                </>
            )}
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    q,
    range,
    status,
    total,
}: {
    page: number;
    totalPages: number;
    q: string;
    range: DateRange;
    status: StatusFilter;
    total: number;
}) {
    if (totalPages <= 1) {
        return (
            <div className="border-t border-border bg-muted/30 px-6 py-3 text-xs text-muted-foreground">
                Showing all {total.toLocaleString()} record{total === 1 ? "" : "s"}
            </div>
        );
    }
    const makeHref = (p: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (range !== "all") params.set("range", range);
        if (status !== "all") params.set("status", status);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return qs ? `/bills?${qs}` : "/bills";
    };
    const fromN = (page - 1) * PAGE_SIZE + 1;
    const toN = Math.min(page * PAGE_SIZE, total);

    return (
        <nav
            className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3 text-xs"
            aria-label="Pagination"
        >
            <span className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{fromN}</span>–
                <span className="font-medium text-foreground">{toN}</span> of{" "}
                <span className="font-medium text-foreground">
                    {total.toLocaleString()}
                </span>
            </span>
            <div className="flex gap-2">
                {page > 1 ? (
                    <Link
                        href={makeHref(page - 1)}
                        className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border transition hover:bg-muted"
                    >
                        Previous
                    </Link>
                ) : null}
                {page < totalPages ? (
                    <Link
                        href={makeHref(page + 1)}
                        className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-border transition hover:bg-muted"
                    >
                        Next
                    </Link>
                ) : null}
            </div>
        </nav>
    );
}

function ErrorState({ message, detail }: { message: string; detail?: string }) {
    return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <p className="text-sm font-medium text-destructive">{message}</p>
            {detail ? (
                <p className="mt-1 text-xs text-destructive/80">{detail}</p>
            ) : null}
        </div>
    );
}
