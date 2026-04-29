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
import { getSupplierPurchasesAction, type SupplierPurchase } from "./actions";

export function SupplierPurchasesModal({
    supplierName,
    payableAmount,
}: {
    supplierName: string;
    payableAmount: string;
}) {
    const [purchases, setPurchases] = useState<SupplierPurchase[] | null>(null);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next && purchases === null) {
            startTransition(async () => {
                const data = await getSupplierPurchasesAction(supplierName);
                setPurchases(data);
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    View
                </button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{supplierName}</DialogTitle>
                    <DialogDescription>
                        {isPending
                            ? "Loading…"
                            : purchases !== null
                              ? `${purchases.length} purchase${purchases.length === 1 ? "" : "s"} · Payable ${payableAmount}`
                              : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 sm:p-6">
                    {isPending ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Loading purchases…
                        </div>
                    ) : purchases !== null && purchases.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No purchases found.
                        </div>
                    ) : purchases !== null ? (
                        <div className="space-y-4">
                            {purchases.map((p) => {
                                const payable = Math.max(
                                    0,
                                    Number(p.total_amount) - Number(p.paid_amount),
                                );
                                const status = deriveStatus({
                                    total_amount: p.total_amount,
                                    received_amount: p.paid_amount,
                                });
                                return (
                                    <div key={p.id} className="overflow-hidden rounded-lg ring-1 ring-border">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <span className="font-mono text-sm font-bold text-foreground">{p.purchase_no}</span>
                                                <span className="text-xs text-muted-foreground">{formatDate(p.purchase_date)}</span>
                                                <StatusBadge status={status} />
                                            </div>
                                            <Link
                                                href={`/purchases/${p.id}/edit`}
                                                onClick={() => setOpen(false)}
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
                                            >
                                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                                Edit
                                            </Link>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[560px] text-sm">
                                                <thead className="border-b border-border bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left font-semibold">Sr#</th>
                                                        <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold">Wt.</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold">Rate</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {p.items.map((item) => (
                                                        <tr key={item.sr_no} className="hover:bg-muted/30">
                                                            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{item.sr_no}</td>
                                                            <td className="px-4 py-2.5 text-foreground">{item.description}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{item.quantity}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{item.weight ?? "—"}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatAmount(item.rate)}</td>
                                                            <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{formatAmount(item.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="border-t-2 border-border bg-muted/30">
                                                    <tr>
                                                        <td colSpan={4} />
                                                        <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Total</td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">{formatAmount(p.total_amount)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={4} />
                                                        <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Paid</td>
                                                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{formatAmount(p.paid_amount)}</td>
                                                    </tr>
                                                    {payable > 0 ? (
                                                        <tr>
                                                            <td colSpan={4} />
                                                            <td className="px-4 py-2.5 text-right text-xs font-semibold text-amber-700">Payable</td>
                                                            <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-amber-700">{formatAmount(payable)}</td>
                                                        </tr>
                                                    ) : null}
                                                </tfoot>
                                            </table>
                                        </div>
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
