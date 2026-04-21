"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil } from "lucide-react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount, formatDate } from "@/lib/format";
import { deriveStatus } from "@/lib/supabase/types";
import { getCustomerBillsAction, type CustomerBill } from "./actions";

export function CustomerBillsModal({
    customerName,
    pendingAmount,
}: {
    customerName: string;
    pendingAmount: string;
}) {
    const [bills, setBills] = useState<CustomerBill[] | null>(null);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next && bills === null) {
            startTransition(async () => {
                const data = await getCustomerBillsAction(customerName);
                setBills(data);
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    View bills
                </button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{customerName}</DialogTitle>
                    <DialogDescription>
                        {isPending
                            ? "Loading…"
                            : bills !== null
                              ? `${bills.length} bill${bills.length === 1 ? "" : "s"} · Pending ${pendingAmount}`
                              : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    {isPending ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Loading bills…
                        </div>
                    ) : bills !== null && bills.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No bills found.
                        </div>
                    ) : bills !== null ? (
                        <div className="space-y-4">
                            {bills.map((bill) => {
                                const pending = Math.max(
                                    0,
                                    Number(bill.total_amount) -
                                        Number(bill.received_amount),
                                );
                                return (
                                    <div
                                        key={bill.id}
                                        className="overflow-hidden rounded-lg ring-1 ring-border"
                                    >
                                        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <span className="font-mono text-sm font-bold text-foreground">
                                                    {bill.bill_no}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(bill.bill_date)}
                                                </span>
                                                <StatusBadge
                                                    status={deriveStatus(bill)}
                                                />
                                            </div>
                                            <Link
                                                href={`/bills/${bill.id}/edit`}
                                                onClick={() => setOpen(false)}
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                            >
                                                <Pencil
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden
                                                />
                                                Edit
                                            </Link>
                                        </div>

                                        <table className="w-full text-sm">
                                            <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-semibold">
                                                        Sr#
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left font-semibold">
                                                        Description
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">
                                                        Qty
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">
                                                        Rate
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right font-semibold">
                                                        Amount
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {bill.items.map((item) => (
                                                    <tr
                                                        key={item.sr_no}
                                                        className="hover:bg-muted/30"
                                                    >
                                                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                                                            {item.sr_no}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-foreground">
                                                            {item.description}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                                            {formatAmount(item.rate)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                                                            {formatAmount(item.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="border-t-2 border-border bg-muted/30">
                                                <tr>
                                                    <td colSpan={3} />
                                                    <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                                                        Total
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">
                                                        {formatAmount(
                                                            bill.total_amount,
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={3} />
                                                    <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                                                        Received
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                                                        {formatAmount(
                                                            bill.received_amount,
                                                        )}
                                                    </td>
                                                </tr>
                                                {pending > 0 ? (
                                                    <tr>
                                                        <td colSpan={3} />
                                                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-amber-700">
                                                            Pending
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-amber-700">
                                                            {formatAmount(pending)}
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </tfoot>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
