import { notFound } from "next/navigation";
import { CURRENCY_SYMBOL, formatAmountPlain, formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PrintActions } from "./print-actions";

function readShopName(meta: Record<string, unknown> | undefined): string {
    const v = meta?.shop_name;
    return typeof v === "string" && v.trim().length > 0 ? v : "Steel Shop";
}

export default async function PrintLedgerPage({
    params,
}: {
    params: Promise<{ customerName: string }>;
}) {
    const { customerName: encodedName } = await params;
    const customerName = decodeURIComponent(encodedName);

    const supabase = await createSupabaseServerClient();

    const [billsRes, userRes] = await Promise.all([
        supabase
            .from("bills")
            .select("id, bill_no, bill_date, total_amount, received_amount")
            .eq("customer_name", customerName)
            .gt("total_amount", "0")
            .order("bill_date", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
    ]);

    if (billsRes.error || !billsRes.data || billsRes.data.length === 0) {
        notFound();
    }

    const bills = billsRes.data;
    const shopName = readShopName(userRes.data.user?.user_metadata);

    const billIds = bills.map((b) => b.id);
    const { data: allItems } = await supabase
        .from("bill_items")
        .select("bill_id, description, sr_no")
        .in("bill_id", billIds)
        .order("bill_id")
        .order("sr_no");

    const descsByBill = new Map<string, string[]>();
    for (const item of allItems ?? []) {
        const arr = descsByBill.get(item.bill_id) ?? [];
        arr.push(item.description);
        descsByBill.set(item.bill_id, arr);
    }

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledgerRows = bills.map((bill) => {
        const debit = Number(bill.total_amount);
        const credit = Number(bill.received_amount);
        totalDebit += debit;
        totalCredit += credit;
        runningBalance += debit - credit;
        const descriptions = (descsByBill.get(bill.id) ?? []).join(", ");
        return { bill, debit, credit, balance: runningBalance, descriptions };
    });

    const netBalance = totalDebit - totalCredit;
    const fromDate = bills[0].bill_date;
    const toDate = bills[bills.length - 1].bill_date;

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
            <style>{`
                @media print {
                    @page { margin: 1.5cm; size: A4; }
                    html, body { background: white !important; }
                }
            `}</style>

            <div className="mx-auto max-w-4xl px-6 print:max-w-none print:px-0">
                <PrintActions />

                <div className="rounded-lg bg-white p-10 text-gray-900 shadow-sm ring-1 ring-gray-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
                    <header className="flex items-start justify-between border-b-2 border-gray-900 pb-6">
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                                {shopName}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Account Statement
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold uppercase tracking-widest text-gray-700">
                                Ledger
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                {formatDate(fromDate)}
                                {fromDate !== toDate
                                    ? ` — ${formatDate(toDate)}`
                                    : ""}
                            </p>
                        </div>
                    </header>

                    <section className="border-b border-gray-200 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            Account
                        </p>
                        <p className="mt-1 text-base font-semibold">
                            {customerName}
                        </p>
                    </section>

                    <table className="mt-6 w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-left text-[11px] uppercase tracking-wider text-gray-600">
                                <th className="w-8 py-2.5 font-semibold">#</th>
                                <th className="w-28 py-2.5 font-semibold">Date</th>
                                <th className="w-28 py-2.5 font-semibold">Invoice</th>
                                <th className="py-2.5 font-semibold">Description</th>
                                <th className="w-28 py-2.5 text-right font-semibold">
                                    Debit
                                </th>
                                <th className="w-28 py-2.5 text-right font-semibold">
                                    Credit
                                </th>
                                <th className="w-28 py-2.5 text-right font-semibold">
                                    Balance
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerRows.map((row, idx) => (
                                <tr
                                    key={row.bill.id}
                                    className="border-b border-gray-100 align-top"
                                >
                                    <td className="py-3 font-mono text-xs text-gray-400">
                                        {idx + 1}
                                    </td>
                                    <td className="py-3 pr-3 text-gray-700">
                                        {formatDate(row.bill.bill_date)}
                                    </td>
                                    <td className="py-3 pr-3 font-mono font-semibold text-gray-900">
                                        {row.bill.bill_no}
                                    </td>
                                    <td className="py-3 pr-3 text-xs text-gray-600">
                                        {row.descriptions || "—"}
                                    </td>
                                    <td className="py-3 text-right font-mono">
                                        {formatAmountPlain(row.debit)}
                                    </td>
                                    <td className="py-3 text-right font-mono text-gray-500">
                                        {row.credit > 0
                                            ? formatAmountPlain(row.credit)
                                            : "—"}
                                    </td>
                                    <td className="py-3 text-right font-mono font-semibold">
                                        {formatAmountPlain(row.balance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-900">
                                <td
                                    colSpan={4}
                                    className="py-3 text-xs font-semibold uppercase tracking-wide text-gray-600"
                                >
                                    Net Movement
                                </td>
                                <td className="py-3 text-right font-mono font-semibold">
                                    {formatAmountPlain(totalDebit)}
                                </td>
                                <td className="py-3 text-right font-mono font-semibold text-gray-500">
                                    {totalCredit > 0
                                        ? formatAmountPlain(totalCredit)
                                        : "—"}
                                </td>
                                <td className="py-3 text-right font-mono font-bold">
                                    {formatAmountPlain(netBalance)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <section className="mt-6 flex justify-end">
                        <dl className="w-full max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between border-b border-gray-200 py-2">
                                <dt className="text-gray-600">Total billed</dt>
                                <dd className="font-mono font-semibold">
                                    {CURRENCY_SYMBOL}{" "}
                                    {formatAmountPlain(totalDebit)}
                                </dd>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 py-2">
                                <dt className="text-gray-600">Total received</dt>
                                <dd className="font-mono">
                                    {CURRENCY_SYMBOL}{" "}
                                    {formatAmountPlain(totalCredit)}
                                </dd>
                            </div>
                            <div className="flex justify-between border-t-2 border-gray-900 py-3 text-base font-bold">
                                <dt>Balance due</dt>
                                <dd className="font-mono">
                                    {CURRENCY_SYMBOL}{" "}
                                    {formatAmountPlain(netBalance)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <footer className="mt-12 border-t border-gray-200 pt-5 text-center text-xs text-gray-500">
                        <p>
                            This is a system-generated statement. Thank you for
                            your business.
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
