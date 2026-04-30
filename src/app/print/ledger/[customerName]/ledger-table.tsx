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
    type: "bill" | "cash";
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
            // Cash rows are reference markers. The cash has already been applied
            // to bills (received_amount updated), so it's reflected in the bill
            // row credits — counting it again here would double up the totals.
            if (row.type === "cash") {
                return { ...row, balance: runningBalance };
            }
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
                    <tr className="bg-gray-900 text-left text-[9px] uppercase tracking-wider text-gray-200 print:bg-transparent print:border-b-2 print:border-black print:text-black [&_th]:pr-3">
                        <th className="w-6 py-1.5 pl-2 font-semibold">#</th>
                        <th className="w-20 py-1.5 font-semibold">Date</th>
                        <th className="w-20 py-1.5 font-semibold">INV NO.</th>
                        <th className="w-20 py-1.5 font-semibold">PO No.</th>
                        <th className="py-1.5 font-semibold">Description</th>
                        <th className="w-20 py-1.5 text-right font-semibold">Total</th>
                        <th className="w-24 py-1.5 text-right font-semibold">Credit</th>
                        <th className="w-20 py-1.5 pr-0 text-right font-semibold">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {computed.rows.map((row, idx) => (
                        <tr
                            key={row.id}
                            className="border-b border-gray-100 align-top print:border-gray-300 [&_td]:pr-3"
                        >
                            <td className="py-1.5 pl-2 font-mono text-[10px] text-gray-400 print:text-gray-700">
                                {idx + 1}
                            </td>
                            <td className="py-1.5 text-gray-700 print:text-black">
                                {formatDate(row.bill_date)}
                            </td>
                            <td className="py-1.5 font-mono font-semibold text-gray-900 print:text-black">
                                {row.type === "cash" ? (
                                    <span className="text-gray-400 print:text-gray-600">—</span>
                                ) : (
                                    row.bill_no
                                )}
                            </td>
                            <td className="py-1.5">
                                {row.type === "cash" ? (
                                    <span className="text-gray-400 print:text-gray-600">—</span>
                                ) : (
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
                                        className="w-full bg-transparent font-mono text-[10px] text-gray-500 outline-none focus:text-gray-900 print:text-gray-800"
                                    />
                                )}
                            </td>
                            <td className="py-1.5 text-[10px] text-gray-600 print:text-gray-900">
                                {row.descriptions || "—"}
                            </td>
                            <td className="py-1.5 text-right font-mono print:text-black">
                                {row.type === "cash" ? (
                                    <span className="text-gray-400 print:text-gray-600">—</span>
                                ) : (
                                    formatAmountPlain(row.debit)
                                )}
                            </td>
                            <td className="py-1.5 text-right">
                                {row.type === "cash" ? (
                                    <span className="font-mono text-[10px] text-emerald-700 print:font-bold print:text-black">
                                        {formatAmountPlain(row.credit)}
                                    </span>
                                ) : (
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
                                        className="w-full bg-transparent text-right font-mono text-xs text-gray-500 outline-none focus:text-gray-900 print:text-gray-800"
                                    />
                                )}
                            </td>
                            <td className="py-1.5 pr-0 text-right font-mono font-semibold print:text-black">
                                {row.type === "cash" ? (
                                    <span className="text-[10px] font-normal text-gray-400 print:text-gray-600">
                                        applied
                                    </span>
                                ) : (
                                    formatAmountPlain(row.balance)
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-900 print:border-black [&_td]:pr-3">
                        <td
                            colSpan={5}
                            className="py-2 pl-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600 print:text-black"
                        >
                            Net Movement
                        </td>
                        <td className="py-2 text-right font-mono font-semibold print:text-black">
                            {formatAmountPlain(computed.totalDebit)}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold text-gray-500 print:text-black">
                            {computed.totalCredit > 0
                                ? formatAmountPlain(computed.totalCredit)
                                : "—"}
                        </td>
                        <td className="py-2 pr-0 text-right font-mono font-bold print:text-black">
                            {formatAmountPlain(computed.netBalance)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <section className="mt-3 flex justify-end">
                <dl className="w-full max-w-xs space-y-0.5 text-xs">
                    <div className="flex justify-between border-b border-gray-200 py-1.5 print:border-gray-400">
                        <dt className="text-gray-600 print:text-gray-900">Total billed</dt>
                        <dd className="font-mono font-semibold print:text-black">
                            {CURRENCY_SYMBOL} {formatAmountPlain(computed.totalDebit)}
                        </dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                        <dt className="text-gray-600 print:text-gray-900">Total received</dt>
                        <dd className="font-mono print:text-black">
                            {CURRENCY_SYMBOL} {formatAmountPlain(computed.totalCredit)}
                        </dd>
                    </div>
                    <div className="flex justify-between border-t-2 border-gray-900 py-2 text-sm font-bold print:border-black print:text-black">
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
