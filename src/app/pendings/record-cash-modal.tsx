"use client";

import { useState, useTransition } from "react";
import { Banknote } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { formatAmount } from "@/lib/format";
import { recordCashReceiptAction } from "./actions";

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecordCashModal({
    customerName,
    pendingAmount,
}: {
    customerName: string;
    pendingAmount: string;
}) {
    const maxAmount = Number(pendingAmount);
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState(todayISO);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next) {
            setDate(todayISO());
            setAmount("");
            setNotes("");
            setError(null);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const amt = Number(amount);
        if (!amt || amt <= 0) {
            setError("Enter a valid amount.");
            return;
        }
        if (amt > maxAmount + 0.005) {
            setError(
                `Amount cannot exceed the outstanding balance of ${formatAmount(maxAmount)}.`,
            );
            return;
        }
        setError(null);
        startTransition(async () => {
            const result = await recordCashReceiptAction(
                customerName,
                amt,
                date,
                notes.trim() || undefined,
            );
            if (result.error) {
                setError(result.error);
            } else {
                setOpen(false);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition hover:opacity-70">
                    <Banknote className="h-3.5 w-3.5" aria-hidden />
                    Cash
                </button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Cash Receipt</DialogTitle>
                    <DialogDescription>
                        {customerName} · Outstanding {formatAmount(maxAmount)}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium" htmlFor="cr-date">
                            Date
                        </label>
                        <input
                            id="cr-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium" htmlFor="cr-amount">
                            Amount
                        </label>
                        <input
                            id="cr-amount"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            max={maxAmount}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            placeholder="0.00"
                            className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Max: {formatAmount(maxAmount)}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium" htmlFor="cr-notes">
                            Notes{" "}
                            <span className="font-normal text-muted-foreground">
                                (optional)
                            </span>
                        </label>
                        <input
                            id="cr-notes"
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="cheque no., reference…"
                            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    {error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : null}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {isPending ? "Saving…" : "Save"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
