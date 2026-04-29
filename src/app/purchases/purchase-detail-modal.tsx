"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Eye, Pencil, Printer } from "lucide-react";
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
import { getPurchaseItemsAction, type PurchaseItemRow } from "./actions";

type PurchaseSummary = {
    id: string;
    purchase_no: string;
    supplier_name: string;
    purchase_date: string;
    total_amount: string;
    paid_amount: string;
};

const DEFAULT_TRIGGER_CLASS =
    "inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70";

export function PurchaseDetailModal({
    purchase,
    children,
    triggerClassName,
}: {
    purchase: PurchaseSummary;
    children?: ReactNode;
    triggerClassName?: string;
}) {
    const [items, setItems] = useState<PurchaseItemRow[] | null>(null);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next && items === null) {
            startTransition(async () => {
                const data = await getPurchaseItemsAction(purchase.id);
                setItems(data);
            });
        }
    }

    const payable = Math.max(
        0,
        Number(purchase.total_amount) - Number(purchase.paid_amount),
    );
    const status = deriveStatus({
        total_amount: purchase.total_amount,
        received_amount: purchase.paid_amount,
    });

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
                >
                    {children ?? (
                        <>
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            View
                        </>
                    )}
                </button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-foreground">
                            {purchase.purchase_no}
                        </span>
                        <StatusBadge status={status} />
                    </div>
                    <DialogTitle>{purchase.supplier_name}</DialogTitle>
                    <DialogDescription>
                        {formatDate(purchase.purchase_date)}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 sm:p-6">
                    {isPending ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Loading line items…
                        </div>
                    ) : items !== null ? (
                        <>
                            <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                                <table className="w-full min-w-[560px] text-sm">
                                    <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Sr#</th>
                                            <th className="px-4 py-3 text-left font-semibold">Description</th>
                                            <th className="px-4 py-3 text-right font-semibold">Qty</th>
                                            <th className="px-4 py-3 text-right font-semibold">Wt.</th>
                                            <th className="px-4 py-3 text-right font-semibold">Rate</th>
                                            <th className="px-4 py-3 text-right font-semibold">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {items.map((item) => (
                                            <tr key={item.sr_no} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 tabular-nums text-muted-foreground">{item.sr_no}</td>
                                                <td className="px-4 py-3 text-foreground">{item.description}</td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{item.weight ?? "—"}</td>
                                                <td className="px-4 py-3 text-right font-mono tabular-nums">{formatAmount(item.rate)}</td>
                                                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{formatAmount(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t-2 border-border bg-muted/30 text-sm">
                                        <tr>
                                            <td colSpan={4} />
                                            <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Total</td>
                                            <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums">{formatAmount(purchase.total_amount)}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan={4} />
                                            <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Paid</td>
                                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{formatAmount(purchase.paid_amount)}</td>
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

                            <div className="mt-5 flex flex-wrap justify-end gap-2">
                                <a
                                    href={`/print/purchases/${purchase.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted"
                                >
                                    <Printer className="h-3.5 w-3.5" aria-hidden />
                                    Print
                                </a>
                                <Link
                                    href={`/purchases/${purchase.id}/edit`}
                                    onClick={() => setOpen(false)}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                                >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                    Edit
                                </Link>
                            </div>
                        </>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
