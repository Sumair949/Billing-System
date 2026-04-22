"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount, formatDate } from "@/lib/format";
import type { BillStatus } from "@/lib/supabase/types";
import { BillDetailModal } from "./bills/bill-detail-modal";

export type CalendarBill = {
    id: string;
    bill_no: string;
    customer_name: string;
    customer_phone: string | null;
    bill_date: string;
    total_amount: string;
    received_amount: string;
    status: BillStatus;
};

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const WEEKDAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function pad(n: number): string {
    return n.toString().padStart(2, "0");
}

function monthParam(year: number, monthIdx: number): string {
    return `${year}-${pad(monthIdx + 1)}`;
}

function addMonth(year: number, monthIdx: number, delta: number) {
    const d = new Date(Date.UTC(year, monthIdx + delta, 1));
    return { year: d.getUTCFullYear(), monthIdx: d.getUTCMonth() };
}

function todayIso(): string {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export function DashboardCalendar({
    year,
    monthIdx,
    bills,
}: {
    year: number;
    monthIdx: number;
    bills: CalendarBill[];
}) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const billsByDate = useMemo(() => {
        const map = new Map<string, CalendarBill[]>();
        for (const b of bills) {
            const arr = map.get(b.bill_date) ?? [];
            arr.push(b);
            map.set(b.bill_date, arr);
        }
        return map;
    }, [bills]);

    const firstDay = new Date(Date.UTC(year, monthIdx, 1));
    const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0));
    const startWeekday = firstDay.getUTCDay();
    const daysInMonth = lastDay.getUTCDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    // Compute "today" only after mount — running it during render would use
    // the server's timezone on SSR and the browser's on hydration, producing
    // mismatched "today" highlights around UTC midnight.
    const [today, setToday] = useState<string>("");
    useEffect(() => {
        setToday(todayIso());
    }, []);
    const prev = addMonth(year, monthIdx, -1);
    const next = addMonth(year, monthIdx, 1);

    const selectedBills = selectedDate
        ? (billsByDate.get(selectedDate) ?? [])
        : [];

    return (
        <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 sm:p-5">
                <div>
                    <h2 className="text-base font-semibold text-foreground sm:text-lg">
                        {MONTH_NAMES[monthIdx]} {year}
                    </h2>
                    <p className="hidden text-xs text-muted-foreground sm:block">
                        Click on any date to view bills
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <Link
                        href={`/?month=${monthParam(prev.year, prev.monthIdx)}`}
                        aria-label="Previous month"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-border transition hover:bg-muted"
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium ring-1 ring-border transition hover:bg-muted"
                    >
                        Today
                    </Link>
                    <Link
                        href={`/?month=${monthParam(next.year, next.monthIdx)}`}
                        aria-label="Next month"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-border transition hover:bg-muted"
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                {WEEKDAY_HEADERS.map((h) => (
                    <div
                        key={h}
                        className="px-1.5 py-2 text-center sm:px-3 sm:py-2.5 sm:text-left"
                    >
                        <span className="sm:hidden">{h.charAt(0)}</span>
                        <span className="hidden sm:inline">{h}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                    const isWeekend = i % 7 === 0 || i % 7 === 6;
                    const isLastRow =
                        Math.floor(i / 7) === Math.floor((cells.length - 1) / 7);
                    const isLastCol = i % 7 === 6;

                    if (d === null) {
                        return (
                            <div
                                key={`empty-${i}`}
                                className={[
                                    "min-h-16 border-border bg-muted/30 sm:min-h-20 lg:min-h-28",
                                    isLastRow ? "" : "border-b",
                                    isLastCol ? "" : "border-r",
                                ].join(" ")}
                            />
                        );
                    }

                    const iso = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
                    const dayBills = billsByDate.get(iso) ?? [];
                    const hasBills = dayBills.length > 0;
                    const isToday = iso === today;

                    return (
                        <button
                            key={iso}
                            type="button"
                            onClick={() => hasBills && setSelectedDate(iso)}
                            disabled={!hasBills}
                            className={[
                                "relative min-h-16 border-border p-1.5 text-left transition sm:min-h-20 sm:p-2 lg:min-h-28 lg:p-2.5",
                                isLastRow ? "" : "border-b",
                                isLastCol ? "" : "border-r",
                                hasBills
                                    ? "cursor-pointer hover:bg-blue-50"
                                    : "cursor-default",
                                isToday
                                    ? "bg-blue-50/70"
                                    : isWeekend
                                      ? "bg-muted/20"
                                      : "bg-surface",
                            ].join(" ")}
                        >
                            <span
                                className={[
                                    "text-xs leading-none sm:text-sm lg:text-base",
                                    isToday
                                        ? "font-bold text-blue-700"
                                        : hasBills
                                          ? "font-semibold text-foreground"
                                          : "text-muted-foreground",
                                ].join(" ")}
                            >
                                {d}
                            </span>
                            {hasBills ? (
                                <span className="absolute left-1/2 top-1/2 inline-flex h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-header px-1.5 text-[10px] font-bold text-header-foreground shadow-sm sm:h-7 sm:min-w-7 sm:text-xs lg:h-8 lg:min-w-8 lg:px-2 lg:text-sm">
                                    {dayBills.length}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            <Dialog
                open={selectedDate !== null}
                onOpenChange={(v) => {
                    if (!v) setSelectedDate(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Bills for{" "}
                            {selectedDate ? formatDate(selectedDate) : ""}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBills.length} bill
                            {selectedBills.length === 1 ? "" : "s"} on this date
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 p-6">
                        {selectedBills.map((bill) => {
                            const pending = Math.max(
                                0,
                                Number(bill.total_amount) -
                                    Number(bill.received_amount),
                            );
                            return (
                                <div
                                    key={bill.id}
                                    className="rounded-lg ring-1 ring-border"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="font-mono text-sm font-bold text-foreground">
                                                {bill.bill_no}
                                            </span>
                                            <StatusBadge status={bill.status} />
                                        </div>
                                        <BillDetailModal
                                            bill={bill}
                                            triggerClassName="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-border transition hover:bg-muted"
                                        >
                                            <Eye
                                                className="h-3.5 w-3.5"
                                                aria-hidden
                                            />
                                            View
                                        </BillDetailModal>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-sm sm:grid-cols-3">
                                        <div>
                                            <dt className="text-xs text-muted-foreground">
                                                Customer
                                            </dt>
                                            <dd className="font-medium text-foreground">
                                                {bill.customer_name}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">
                                                Total
                                            </dt>
                                            <dd className="font-mono font-semibold tabular-nums">
                                                {formatAmount(bill.total_amount)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">
                                                Pending
                                            </dt>
                                            <dd
                                                className={[
                                                    "font-mono font-semibold tabular-nums",
                                                    pending > 0
                                                        ? "text-amber-700"
                                                        : "text-muted-foreground",
                                                ].join(" ")}
                                            >
                                                {formatAmount(pending)}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
