"use client";

import {
    Calculator,
    FileText,
    Package,
    Plus,
    Printer,
    Trash2,
    User,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY_SYMBOL, formatAmountPlain } from "@/lib/format";
import type { BillFormState } from "./actions";

const initialState: BillFormState = {};

type ItemDraft = {
    description: string;
    quantity: string;
    weight: string;
    rate: string;
};

const emptyItem: ItemDraft = {
    description: "",
    quantity: "1",
    weight: "",
    rate: "",
};

type Props = {
    action: (state: BillFormState, formData: FormData) => Promise<BillFormState>;
    submitLabel: string;
    defaultValues?: {
        customer_name?: string;
        customer_phone?: string;
        bill_date?: string;
        received_amount?: string;
        total_amount?: string;
        items?: ItemDraft[];
    };
};

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
    ).padStart(2, "0")}`;
}

function safeNumber(value: string): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function BillForm({ action, submitLabel, defaultValues }: Props) {
    const [state, formAction, pending] = useActionState(action, initialState);
    const [items, setItems] = useState<ItemDraft[]>(() =>
        defaultValues?.items && defaultValues.items.length > 0
            ? defaultValues.items
            : [{ ...emptyItem }],
    );
    const [received, setReceived] = useState<string>(
        defaultValues?.received_amount ?? "0",
    );

    const autoTotal = useMemo(() => {
        return items.reduce((sum, it) => {
            return sum + safeNumber(it.quantity) * safeNumber(it.rate);
        }, 0);
    }, [items]);

    // Null → follow the item sum. A string → user has typed an override.
    const [totalOverride, setTotalOverride] = useState<string | null>(() => {
        if (defaultValues?.total_amount === undefined) return null;
        const n = Number(defaultValues.total_amount);
        if (!Number.isFinite(n)) return null;
        // If the persisted total already matches the item sum within a cent,
        // start in auto mode — editing items will keep total in sync.
        const initialAuto = (defaultValues.items ?? []).reduce(
            (sum, it) => sum + safeNumber(it.quantity) * safeNumber(it.rate),
            0,
        );
        return Math.abs(n - initialAuto) < 0.005
            ? null
            : defaultValues.total_amount;
    });

    const total =
        totalOverride !== null ? safeNumber(totalOverride) : autoTotal;
    const pending_ = Math.max(0, total - safeNumber(received));

    function updateItem(index: number, patch: Partial<ItemDraft>) {
        setItems((prev) =>
            prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
        );
    }

    function addItem() {
        setItems((prev) => [...prev, { ...emptyItem }]);
    }

    function removeItem(index: number) {
        setItems((prev) => prev.filter((_, i) => i !== index));
    }

    const itemError = state.fieldErrors?.items;

    return (
        <form action={formAction} className="space-y-6" noValidate>
            <SectionCard
                icon={<User className="h-4 w-4" />}
                title="Customer details"
                description="Who is this bill for, and when was it issued."
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="customer_name">Customer name</Label>
                        <Input
                            id="customer_name"
                            name="customer_name"
                            type="text"
                            required
                            maxLength={200}
                            defaultValue={defaultValues?.customer_name}
                            aria-invalid={
                                state.fieldErrors?.customer_name ? true : undefined
                            }
                            placeholder="e.g. Ahmed Raza"
                            className="h-11"
                        />
                        <FieldError message={state.fieldErrors?.customer_name} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer_phone">Phone</Label>
                        <Input
                            id="customer_phone"
                            name="customer_phone"
                            type="tel"
                            inputMode="tel"
                            maxLength={25}
                            defaultValue={defaultValues?.customer_phone ?? ""}
                            aria-invalid={
                                state.fieldErrors?.customer_phone ? true : undefined
                            }
                            placeholder="e.g. 0300-1234567"
                            className="h-11"
                        />
                        <FieldError message={state.fieldErrors?.customer_phone} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="bill_date">Bill date</Label>
                        <Input
                            id="bill_date"
                            name="bill_date"
                            type="date"
                            required
                            defaultValue={defaultValues?.bill_date ?? todayIso()}
                            aria-invalid={
                                state.fieldErrors?.bill_date ? true : undefined
                            }
                            className="h-11"
                        />
                        <FieldError message={state.fieldErrors?.bill_date} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                icon={<Package className="h-4 w-4" />}
                title="Line items"
                description="Add one row per product or service. Amount is calculated automatically."
                action={
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-xs font-semibold text-background shadow-sm transition hover:bg-foreground/90"
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Add row
                    </button>
                }
            >
                <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                    <table className="w-full min-w-[600px] text-sm">
                        <thead className="border-b border-border bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="w-14 px-4 py-3 font-semibold">
                                    Sr#
                                </th>
                                <th className="px-3 py-3 font-semibold">
                                    Description
                                </th>
                                <th className="w-24 px-3 py-3 text-right font-semibold">
                                    Qty
                                </th>
                                <th className="w-28 px-3 py-3 text-right font-semibold">
                                    Weight
                                </th>
                                <th className="w-32 px-3 py-3 text-right font-semibold">
                                    Rate
                                </th>
                                <th className="w-36 px-4 py-3 text-right font-semibold">
                                    Amount
                                </th>
                                <th className="w-12 px-2 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {items.map((item, i) => {
                                const amount =
                                    safeNumber(item.quantity) *
                                    safeNumber(item.rate);
                                return (
                                    <tr
                                        key={i}
                                        className="align-middle transition hover:bg-muted/20"
                                    >
                                        <td className="px-4 py-3 font-mono text-sm font-semibold text-muted-foreground">
                                            {String(i + 1).padStart(2, "0")}
                                        </td>
                                        <td className="px-2 py-2">
                                            <Input
                                                type="text"
                                                placeholder="e.g. 12mm TMT bar"
                                                value={item.description}
                                                onChange={(e) =>
                                                    updateItem(i, {
                                                        description:
                                                            e.target.value,
                                                    })
                                                }
                                                maxLength={500}
                                                className="h-10 border-transparent bg-transparent focus-visible:border-border focus-visible:bg-surface"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="1"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(i, {
                                                        quantity: e.target.value,
                                                    })
                                                }
                                                onFocus={(e) => e.target.select()}
                                                className="h-10 border-transparent bg-transparent text-right font-mono focus-visible:border-border focus-visible:bg-surface"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <Input
                                                type="text"
                                                placeholder="—"
                                                value={item.weight}
                                                onChange={(e) =>
                                                    updateItem(i, {
                                                        weight: e.target.value,
                                                    })
                                                }
                                                onFocus={(e) => e.target.select()}
                                                className="h-10 border-transparent bg-transparent text-right font-mono focus-visible:border-border focus-visible:bg-surface"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                value={item.rate}
                                                onChange={(e) =>
                                                    updateItem(i, {
                                                        rate: e.target.value,
                                                    })
                                                }
                                                onFocus={(e) => e.target.select()}
                                                className="h-10 border-transparent bg-transparent text-right font-mono focus-visible:border-border focus-visible:bg-surface"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                                            {formatAmountPlain(amount)}
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                disabled={items.length === 1}
                                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                                aria-label="Remove row"
                                            >
                                                <Trash2
                                                    className="h-4 w-4"
                                                    aria-hidden
                                                />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <FieldError message={itemError} />
            </SectionCard>

            <SectionCard
                icon={<Calculator className="h-4 w-4" />}
                title="Payment summary"
                description="Record how much has been received. The pending balance updates automatically."
            >
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-header px-4 py-3 text-header-foreground shadow-sm">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="total_amount"
                                className="text-[11px] font-semibold uppercase tracking-wider text-header-foreground/70"
                            >
                                Total
                            </Label>
                            {totalOverride !== null ? (
                                <button
                                    type="button"
                                    onClick={() => setTotalOverride(null)}
                                    className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-header-foreground/70 underline-offset-2 hover:text-header-foreground hover:underline"
                                >
                                    Reset
                                </button>
                            ) : null}
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="font-mono text-base font-semibold opacity-80">
                                {CURRENCY_SYMBOL}
                            </span>
                            <Input
                                id="total_amount"
                                name="total_amount"
                                type="text"
                                inputMode="decimal"
                                required
                                value={
                                    totalOverride !== null
                                        ? totalOverride
                                        : autoTotal.toFixed(2)
                                }
                                onChange={(e) =>
                                    setTotalOverride(e.target.value)
                                }
                                onFocus={(e) => e.target.select()}
                                aria-invalid={
                                    state.fieldErrors?.total_amount
                                        ? true
                                        : undefined
                                }
                                className="h-8 flex-1 border-transparent bg-transparent px-0 font-mono text-lg font-bold tabular-nums text-header-foreground focus-visible:border-header-foreground/30 focus-visible:bg-header-foreground/10 focus-visible:px-2"
                            />
                        </div>
                        <div className="mt-1">
                            <FieldError
                                message={state.fieldErrors?.total_amount}
                            />
                        </div>
                    </div>
                    <div className="rounded-lg bg-surface px-4 py-3 ring-1 ring-border">
                        <Label
                            htmlFor="received_amount"
                            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                            Received
                        </Label>
                        <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="font-mono text-base font-semibold text-muted-foreground">
                                {CURRENCY_SYMBOL}
                            </span>
                            <Input
                                id="received_amount"
                                name="received_amount"
                                type="text"
                                inputMode="decimal"
                                required
                                value={received}
                                onChange={(e) => setReceived(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                aria-invalid={
                                    state.fieldErrors?.received_amount
                                        ? true
                                        : undefined
                                }
                                className="h-8 flex-1 border-transparent bg-transparent px-0 font-mono text-lg font-bold tabular-nums focus-visible:border-border focus-visible:bg-muted/30 focus-visible:px-2"
                            />
                        </div>
                        <div className="mt-1">
                            <FieldError
                                message={state.fieldErrors?.received_amount}
                            />
                        </div>
                    </div>
                    <SummaryTile
                        label="Pending"
                        value={pending_}
                        emphasis={pending_ > 0 ? "warning" : "muted"}
                    />
                </div>
            </SectionCard>

            {/* Line items are sent as a single JSON payload for simplicity. */}
            <input type="hidden" name="items" value={JSON.stringify(items)} />

            {state.error ? (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
                >
                    {state.error}
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-border">
                <Link
                    href="/"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-muted"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    name="action"
                    value="save-print"
                    disabled={pending}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Printer className="h-4 w-4" aria-hidden />
                    {pending ? "Saving…" : "Save & print"}
                </button>
                <button
                    type="submit"
                    name="action"
                    value="save"
                    disabled={pending}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <FileText className="h-4 w-4" aria-hidden />
                    {pending ? "Saving…" : submitLabel}
                </button>
            </div>
        </form>
    );
}

function SectionCard({
    icon,
    title,
    description,
    action,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                    <span
                        className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-header text-header-foreground"
                        aria-hidden
                    >
                        {icon}
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">
                            {title}
                        </h3>
                        {description ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </header>
            <div className="p-4 sm:p-6">{children}</div>
        </section>
    );
}

function SummaryTile({
    label,
    value,
    emphasis,
}: {
    label: string;
    value: number;
    emphasis?: "warning" | "muted";
}) {
    const wrapper =
        emphasis === "warning"
            ? "bg-amber-600 text-white"
            : "bg-header text-header-foreground";
    const labelColor =
        emphasis === "warning" ? "text-white/80" : "text-header-foreground/70";
    return (
        <div className={`rounded-lg px-4 py-3 shadow-sm ${wrapper}`}>
            <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${labelColor}`}
            >
                {label}
            </p>
            <p className="mt-1.5 font-mono text-lg font-bold tabular-nums">
                <span className="opacity-80">{CURRENCY_SYMBOL}</span>{" "}
                {formatAmountPlain(value)}
            </p>
        </div>
    );
}
