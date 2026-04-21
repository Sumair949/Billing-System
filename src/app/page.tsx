import { z } from "zod";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount, formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BillStatus } from "@/lib/supabase/types";
import { BillDetailModal } from "./bills/bill-detail-modal";
import { FlashToast } from "./bills/flash-toast";
import { DashboardCalendar, type CalendarBill } from "./dashboard-calendar";

const monthSchema = z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional();

type SearchParams = { month?: string };

type StatsRow = {
    total_count: number;
    total_revenue: string;
    outstanding: string;
    this_month_count: number;
};

type RecentBill = {
    id: string;
    bill_no: string;
    customer_name: string;
    bill_date: string;
    total_amount: string;
    received_amount: string;
    status: BillStatus;
};

function parseMonth(raw: string | undefined): { year: number; monthIdx: number } {
    const parsed = monthSchema.safeParse(raw);
    if (parsed.success && parsed.data) {
        const [y, m] = parsed.data.split("-").map(Number);
        if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) {
            return { year: y, monthIdx: m - 1 };
        }
    }
    const now = new Date();
    return { year: now.getFullYear(), monthIdx: now.getMonth() };
}

function monthBounds(year: number, monthIdx: number) {
    const first = new Date(Date.UTC(year, monthIdx, 1));
    const next = new Date(Date.UTC(year, monthIdx + 1, 1));
    return {
        fromDate: first.toISOString().slice(0, 10),
        toDate: next.toISOString().slice(0, 10),
    };
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const { month } = await searchParams;
    const { year, monthIdx } = parseMonth(month);
    const { fromDate, toDate } = monthBounds(year, monthIdx);

    const supabase = await createSupabaseServerClient();

    const [billsRes, statsRes, recentRes] = await Promise.all([
        supabase
            .from("bills")
            .select(
                "id, bill_no, customer_name, bill_date, total_amount, received_amount, status",
            )
            .gte("bill_date", fromDate)
            .lt("bill_date", toDate)
            .order("bill_date", { ascending: true }),
        supabase.rpc("bill_stats"),
        supabase
            .from("bills")
            .select(
                "id, bill_no, customer_name, bill_date, total_amount, received_amount, status",
            )
            .order("created_at", { ascending: false })
            .limit(6),
    ]);

    const bills = (billsRes.data ?? []) as CalendarBill[];
    const recent = (recentRes.data ?? []) as RecentBill[];
    const stats = (statsRes.data as StatsRow | null) ?? {
        total_count: 0,
        total_revenue: "0",
        outstanding: "0",
        this_month_count: 0,
    };

    return (
        <AppShell>
            <Suspense>
                <FlashToast />
            </Suspense>
            <section className="space-y-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Dashboard
                        </h1>
                        <p className="mt-2 text-base text-muted-foreground">
                            Shop activity at a glance. Click any date to review
                            that day&apos;s bills.
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
                        emphasis={
                            Number(stats.outstanding) > 0 ? "warning" : undefined
                        }
                    />
                    <StatCard
                        label="This month"
                        value={stats.this_month_count.toLocaleString()}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <DashboardCalendar
                        year={year}
                        monthIdx={monthIdx}
                        bills={bills}
                    />
                    <RecentBillsPanel bills={recent} />
                </div>
            </section>
        </AppShell>
    );
}

function RecentBillsPanel({ bills }: { bills: RecentBill[] }) {
    return (
        <aside className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
            <div className="border-b border-border p-5">
                <h2 className="text-base font-semibold text-foreground">
                    Recent bills
                </h2>
                <p className="text-xs text-muted-foreground">
                    Latest activity in your shop
                </p>
            </div>
            {bills.length === 0 ? (
                <div className="flex-1 p-8 text-center text-sm text-muted-foreground">
                    No bills yet. Create one to see it here.
                </div>
            ) : (
                <ul className="flex-1 divide-y divide-border">
                    {bills.map((bill) => {
                        const pending = Math.max(
                            0,
                            Number(bill.total_amount) -
                                Number(bill.received_amount),
                        );
                        return (
                            <li key={bill.id}>
                                <BillDetailModal
                                    bill={bill}
                                    triggerClassName="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-foreground">
                                                {bill.bill_no}
                                            </span>
                                            <StatusBadge status={bill.status} />
                                        </div>
                                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                                            {bill.customer_name}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            {formatDate(bill.bill_date)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                                            {formatAmount(bill.total_amount)}
                                        </p>
                                        {pending > 0 ? (
                                            <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums text-amber-700">
                                                {formatAmount(pending)} due
                                            </p>
                                        ) : null}
                                    </div>
                                </BillDetailModal>
                            </li>
                        );
                    })}
                </ul>
            )}
            <Link
                href="/bills"
                className="inline-flex items-center justify-center gap-1 border-t border-border bg-muted/30 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
            >
                View all bills
                <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
        </aside>
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
