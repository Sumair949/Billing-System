import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { readShopInfo } from "@/lib/shop";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LedgerTable, type LedgerRow } from "./ledger-table";
import { PrintActions } from "./print-actions";

export default async function PrintLedgerPage({
    params,
}: {
    params: Promise<{ customerName: string }>;
}) {
    const { customerName: encodedName } = await params;
    const customerName = decodeURIComponent(encodedName);

    const supabase = await createSupabaseServerClient();

    const [billsRes, userRes, cashRes] = await Promise.all([
        supabase
            .from("bills")
            .select("id, bill_no, bill_date, total_amount, received_amount")
            .eq("customer_name", customerName)
            .gt("total_amount", "0")
            .order("bill_date", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
        supabase
            .from("cash_receipts")
            .select("id, receipt_date, amount, notes")
            .eq("customer_name", customerName)
            .order("receipt_date", { ascending: true })
            .order("created_at", { ascending: true }),
    ]);

    if (billsRes.error || !billsRes.data || billsRes.data.length === 0) {
        notFound();
    }

    const bills = billsRes.data;
    const shop = readShopInfo(userRes.data.user?.user_metadata);

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

    const billRows: LedgerRow[] = bills.map((bill) => ({
        id: bill.id,
        bill_no: bill.bill_no,
        bill_date: bill.bill_date,
        debit: Number(bill.total_amount),
        credit: Number(bill.received_amount),
        descriptions: (descsByBill.get(bill.id) ?? []).join(", "),
        type: "bill",
    }));

    type CashReceiptRow = { id: string; receipt_date: string; amount: string; notes: string | null };
    const cashRows: LedgerRow[] = ((cashRes.data ?? []) as CashReceiptRow[]).map((c) => ({
        id: c.id,
        bill_no: "",
        bill_date: c.receipt_date,
        debit: 0,
        credit: Number(c.amount),
        descriptions: c.notes ? `Cash received — ${c.notes}` : "Cash received",
        type: "cash",
    }));

    const ledgerRows: LedgerRow[] = [...billRows, ...cashRows].sort(
        (a, b) => a.bill_date.localeCompare(b.bill_date),
    );

    const allDates = ledgerRows.map((r) => r.bill_date);
    const fromDate = allDates[0];
    const toDate = allDates[allDates.length - 1];

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
            <style>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    html, body { background: white !important; }
                }
            `}</style>

            <div className="mx-auto max-w-4xl px-6 print:max-w-none print:px-0">
                <PrintActions filename={`Ledger-${customerName}`} format="a4" />

                <div id="print-card" className="relative flex flex-col rounded-lg bg-white text-gray-900 shadow-md ring-1 ring-gray-200 print:min-h-[29cm] print:rounded-none print:shadow-none print:ring-0">
                    {shop.watermark_url ? (
                        <div
                            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg print:rounded-none"
                            aria-hidden
                        >
                            <img
                                src={shop.watermark_url}
                                alt=""
                                className="h-3/4 w-3/4 select-none object-contain opacity-[0.07]"
                            />
                        </div>
                    ) : null}

                    <div className="h-1.5 shrink-0 rounded-t-lg bg-gray-800 print:hidden" />

                    <div className="flex flex-1 flex-col px-8 pb-6 pt-6 print:px-4 print:pb-3 print:pt-3">

                        <header className="relative border-b-2 border-gray-200 pb-4 print:border-gray-900">
                            <div className="text-center">
                                <h1 className="text-2xl font-extrabold uppercase tracking-tight text-gray-900">
                                    {shop.name}
                                </h1>
                                {[shop.address, shop.phone, shop.email].some(Boolean) ? (
                                    <p className="mt-1 text-[11px] text-gray-500 print:text-gray-800">
                                        {[shop.address, shop.phone, shop.email].filter(Boolean).join(" · ")}
                                    </p>
                                ) : null}
                                <p className="mt-0.5 text-[11px] text-gray-500 print:text-gray-800">
                                    NTN: {shop.ntn ?? (
                                        <span className="inline-block w-28 border-b border-gray-300 align-bottom print:border-gray-600">&nbsp;</span>
                                    )} &nbsp;·&nbsp; STN: {shop.stn ?? (
                                        <span className="inline-block w-28 border-b border-gray-300 align-bottom print:border-gray-600">&nbsp;</span>
                                    )}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-400 print:text-gray-700">Account Statement</p>
                            </div>
                            <div className="absolute right-0 top-0 text-right">
                                <div className="inline-block rounded bg-gray-900 px-3 py-1.5 print:bg-transparent print:border-2 print:border-black">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-300 print:text-black">Ledger</p>
                                    <p className="mt-0.5 text-[11px] text-gray-200 print:text-black">
                                        {formatDate(fromDate)}
                                        {fromDate !== toDate ? ` — ${formatDate(toDate)}` : ""}
                                    </p>
                                </div>
                            </div>
                        </header>

                        <section className="py-3">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-700">Account</p>
                            <p className="text-sm font-bold text-gray-900">{customerName}</p>
                        </section>

                        <div className="border-t border-gray-200 print:border-gray-500" />

                        <LedgerTable rows={ledgerRows} />

                        <div className="flex-1 py-4" />

                        <section className="grid grid-cols-2 gap-8">
                            <div>
                                <div className="mb-1 border-b-2 border-dashed border-gray-300 print:border-gray-600 print:border-solid" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-700">Prepared by</p>
                            </div>
                            <div>
                                <div className="mb-1 border-b-2 border-dashed border-gray-300 print:border-gray-600 print:border-solid" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-700">Customer signature</p>
                            </div>
                        </section>

                        <footer className="mt-4">
                            <div className="border-t border-gray-200 print:border-gray-600" />
                            <p className="mt-2 text-center text-[10px] text-gray-400 print:text-gray-800">
                                This is a system-generated statement. Thank you for your business.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
