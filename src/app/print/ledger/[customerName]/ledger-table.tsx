"use client";

import { useMemo, useState } from "react";
import { CURRENCY_SYMBOL, formatAmountPlain, formatDate } from "@/lib/format";

export type LedgerRow = {
    id: string;
    bill_no: string;
    bill_date: string;
    debit: number;
    credit: number;
    descriptions: string;
};

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
    const [credits, setCredits] = useState<string[]>(() =>
        rows.map((r) => (r.credit > 0 ? String(r.credit) : "")),
    );
    const [poNums, setPoNums] = useState<string[]>(() => rows.map(() => ""));

    const computed = useMemo(() => {
        let runningBalance = 0;
        let totalDebit = 0;
        let totalCredit = 0;
        const out = rows.map((row, i) => {
            const credit = Number(credits[i]) || 0;
            const debit = row.debit;
            totalDebit += debit;
            totalCredit += credit;
            runningBalance += debit - credit;
            return { ...row, credit, balance: runningBalance };
        });
        return { rows: out, totalDebit, totalCredit, netBalance: totalDebit - totalCredit };
    }, [rows, credits]);

    return (
        <>
            <table className="mt-4 w-full border-collapse text-xs">
                <thead>
                    <tr className="border-b-2 border-gray-900 text-left text-[10px] uppercase tracking-wider text-gray-600 [&_th]:pr-3">
                        <th className="w-6 py-2 font-semibold">#</th>
                        <th className="w-20 py-2 font-semibold">Date</th>
                        <th className="w-20 py-2 font-semibold">INV NO.</th>
                        <th className="w-20 py-2 font-semibold">PO No.</th>
                        <th className="py-2 font-semibold">Description</th>
                        <th className="w-20 py-2 text-right font-semibold">Total</th>
                        <th className="w-24 py-2 text-right font-semibold">Credit</th>
                        <th className="w-20 py-2 pr-0 text-right font-semibold">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {computed.rows.map((row, idx) => (
                        <tr key={row.id} className="border-b border-gray-100 align-top [&_td]:pr-3">
                            <td className="py-2 font-mono text-[10px] text-gray-400">
                                {idx + 1}
                            </td>
                            <td className="py-2 text-gray-700">
                                {formatDate(row.bill_date)}
                            </td>
                            <td className="py-2 font-mono font-semibold text-gray-900">
                                {row.bill_no}
                            </td>
                            <td className="py-2">
                                <input
                                    type="text"
                                    value={poNums[idx]}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setPoNums((prev) =>
                                            prev.map((p, i) => (i === idx ? val : p)),
                                        );
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="—"
                                    className="w-full bg-transparent font-mono text-[10px] text-gray-500 outline-none focus:text-gray-900 print:text-gray-500"
                                />
                            </td>
                            <td className="py-2 text-[10px] text-gray-600">
                                {row.descriptions || "—"}
                            </td>
                            <td className="py-2 text-right font-mono">
                                {formatAmountPlain(row.debit)}
                            </td>
                            <td className="py-2 text-right">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={credits[idx]}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCredits((prev) =>
                                            prev.map((c, i) => (i === idx ? val : c)),
                                        );
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="—"
                                    className="w-full bg-transparent text-right font-mono text-xs text-gray-500 outline-none focus:text-gray-900 print:text-gray-500"
                                />
                            </td>
                            <td className="py-2 pr-0 text-right font-mono font-semibold">
                                {formatAmountPlain(row.balance)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-900 [&_td]:pr-3">
                        <td
                            colSpan={5}
                            className="py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
                        >
                            Net Movement
                        </td>
                        <td className="py-2 text-right font-mono font-semibold">
                            {formatAmountPlain(computed.totalDebit)}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold text-gray-500">
                            {computed.totalCredit > 0
                                ? formatAmountPlain(computed.totalCredit)
                                : "—"}
                        </td>
                        <td className="py-2 pr-0 text-right font-mono font-bold">
                            {formatAmountPlain(computed.netBalance)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <section className="mt-3 flex justify-end">
                <dl className="w-full max-w-xs space-y-0.5 text-xs">
                    <div className="flex justify-between border-b border-gray-200 py-1.5">
                        <dt className="text-gray-600">Total billed</dt>
                        <dd className="font-mono font-semibold">
                            {CURRENCY_SYMBOL} {formatAmountPlain(computed.totalDebit)}
                        </dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                        <dt className="text-gray-600">Total received</dt>
                        <dd className="font-mono">
                            {CURRENCY_SYMBOL} {formatAmountPlain(computed.totalCredit)}
                        </dd>
                    </div>
                    <div className="flex justify-between border-t-2 border-gray-900 py-2 text-sm font-bold">
                        <dt>Balance due</dt>
                        <dd className="font-mono">
                            {CURRENCY_SYMBOL} {formatAmountPlain(computed.netBalance)}
                        </dd>
                    </div>
                </dl>
            </section>
        </>
    );
}
