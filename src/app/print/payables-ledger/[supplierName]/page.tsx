import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { readShopInfo } from "@/lib/shop";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayablesLedgerTable, type PayablesLedgerRow } from "./ledger-table";
import { PrintActions } from "./print-actions";

export default async function PrintPayablesLedgerPage({
    params,
}: {
    params: Promise<{ supplierName: string }>;
}) {
    const { supplierName: encodedName } = await params;
    const supplierName = decodeURIComponent(encodedName);

    const supabase = await createSupabaseServerClient();

    const [purchasesRes, userRes] = await Promise.all([
        supabase
            .from("purchases")
            .select("id, purchase_no, purchase_date, total_amount, paid_amount")
            .eq("supplier_name", supplierName)
            .gt("total_amount", "0")
            .order("purchase_date", { ascending: true })
            .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
    ]);

    if (purchasesRes.error || !purchasesRes.data || purchasesRes.data.length === 0) {
        notFound();
    }

    const purchases = purchasesRes.data;
    const shop = readShopInfo(userRes.data.user?.user_metadata);

    const purchaseIds = purchases.map((p) => p.id);
    const { data: allItems } = await supabase
        .from("purchase_items")
        .select("purchase_id, description, sr_no")
        .in("purchase_id", purchaseIds)
        .order("purchase_id")
        .order("sr_no");

    const descsByPurchase = new Map<string, string[]>();
    for (const item of allItems ?? []) {
        const arr = descsByPurchase.get(item.purchase_id) ?? [];
        arr.push(item.description);
        descsByPurchase.set(item.purchase_id, arr);
    }

    const ledgerRows: PayablesLedgerRow[] = purchases.map((p) => ({
        id: p.id,
        invoice_no: p.purchase_no,
        purchase_date: p.purchase_date,
        debit: Number(p.total_amount),
        credit: Number(p.paid_amount),
        descriptions: (descsByPurchase.get(p.id) ?? []).join(", "),
    }));

    const fromDate = purchases[0].purchase_date;
    const toDate = purchases[purchases.length - 1].purchase_date;

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
            <style>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    html, body { background: white !important; }
                }
            `}</style>

            <div className="mx-auto max-w-4xl px-6 print:max-w-none print:px-0">
                <PrintActions />

                <div className="flex flex-col rounded-lg bg-white p-10 text-gray-900 shadow-sm ring-1 ring-gray-200 print:min-h-[29cm] print:rounded-none print:p-3 print:shadow-none print:ring-0">
                    <header className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">
                                {shop.name}
                            </h1>
                            {shop.address ? (
                                <p className="mt-0.5 text-xs text-gray-600">{shop.address}</p>
                            ) : null}
                            {shop.phone ? (
                                <p className="mt-0.5 font-mono text-xs text-gray-600">
                                    {shop.phone}
                                </p>
                            ) : null}
                            {shop.email ? (
                                <p className="mt-0.5 text-xs text-gray-600">
                                    {shop.email}
                                </p>
                            ) : null}
                            <p className="mt-0.5 text-xs text-gray-500">Supplier Account Statement</p>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-bold uppercase tracking-widest text-gray-700">
                                Ledger
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {formatDate(fromDate)}
                                {fromDate !== toDate ? ` — ${formatDate(toDate)}` : ""}
                            </p>
                        </div>
                    </header>

                    <section className="border-b border-gray-200 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                            Supplier
                        </p>
                        <p className="mt-1 text-sm font-semibold">{supplierName}</p>
                    </section>

                    <PayablesLedgerTable rows={ledgerRows} />

                    {/* Spacer pushes signatures + footer to the bottom of the page */}
                    <div className="flex-1" />

                    <section className="mt-8 grid grid-cols-2 gap-8 pt-6">
                        <div>
                            <div className="mb-1 border-b border-gray-400" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Prepared by
                            </p>
                        </div>
                        <div>
                            <div className="mb-1 border-b border-gray-400" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Supplier signature
                            </p>
                        </div>
                    </section>

                    <footer className="mt-6 border-t border-gray-200 pt-4 text-center text-[10px] text-gray-500">
                        <p>This is a system-generated statement. Thank you for your business.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
