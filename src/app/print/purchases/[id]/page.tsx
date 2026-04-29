import { notFound } from "next/navigation";
import { CURRENCY_SYMBOL, formatAmountPlain, formatDate } from "@/lib/format";
import { readShopInfo } from "@/lib/shop";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PrintActions } from "./print-actions";

type ItemRow = {
    sr_no: number;
    description: string;
    quantity: string | null;
    weight: string | null;
    rate: string;
    amount: string;
};

export default async function PrintPurchasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const [purchaseRes, itemsRes, userRes] = await Promise.all([
        supabase
            .from("purchases")
            .select(
                "id, purchase_no, supplier_name, purchase_date, total_amount, paid_amount, freight_charges, loading_charges, discount, prepared_by, approved_by",
            )
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("purchase_items")
            .select("sr_no, description, quantity, weight, rate, amount")
            .eq("purchase_id", id)
            .order("sr_no", { ascending: true }),
        supabase.auth.getUser(),
    ]);

    if (purchaseRes.error || !purchaseRes.data) notFound();

    const purchase = purchaseRes.data;
    const items = (itemsRes.data ?? []) as ItemRow[];
    const shop = readShopInfo(userRes.data.user?.user_metadata);
    const payable = Math.max(
        0,
        Number(purchase.total_amount) - Number(purchase.paid_amount),
    );

    const freightLoadingCharges =
        Number(purchase.freight_charges ?? 0) + Number(purchase.loading_charges ?? 0);
    const discountAmt = Number(purchase.discount ?? 0);
    const subtotal =
        Number(purchase.total_amount) - freightLoadingCharges + discountAmt;

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
            <style>{`
                @media print {
                    @page { margin: 0; size: A5; }
                    html, body { background: white !important; }
                }
            `}</style>

            <div className="mx-auto max-w-2xl px-4 print:max-w-none print:px-0">
                <PrintActions />

                <div className="flex flex-col rounded-lg bg-white p-8 text-gray-900 shadow-sm ring-1 ring-gray-200 print:min-h-[20.5cm] print:rounded-none print:p-3 print:shadow-none print:ring-0">
                    {/* Header */}
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
                            <p className="mt-0.5 text-xs text-gray-500">Purchase Record</p>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-bold uppercase tracking-widest text-gray-700">
                                Purchase
                            </p>
                            <p className="mt-0.5 font-mono text-sm font-semibold">
                                {purchase.purchase_no}
                            </p>
                        </div>
                    </header>

                    {/* Supplier + Date */}
                    <section className="grid grid-cols-2 gap-6 border-b border-gray-200 py-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Supplier
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                {purchase.supplier_name}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Purchase date
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                {formatDate(purchase.purchase_date)}
                            </p>
                        </div>
                    </section>

                    {/* Items table */}
                    <table className="mt-4 w-full border-collapse text-xs">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-left text-[10px] uppercase tracking-wider text-gray-600">
                                <th className="w-12 py-2 font-semibold">Sr#</th>
                                <th className="py-2 font-semibold">Description</th>
                                <th className="w-14 py-2 text-right font-semibold">Qty</th>
                                <th className="w-14 py-2 text-right font-semibold">Wt.</th>
                                <th className="w-20 py-2 text-right font-semibold">Rate</th>
                                <th className="w-22 py-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr
                                    key={item.sr_no}
                                    className="border-b border-gray-200 align-top"
                                >
                                    <td className="py-2 font-mono text-gray-500">
                                        {String(item.sr_no).padStart(2, "0")}
                                    </td>
                                    <td className="py-2 pr-2">{item.description}</td>
                                    <td className="py-2 text-right font-mono">
                                        {item.quantity ?? "—"}
                                    </td>
                                    <td className="py-2 text-right font-mono text-gray-600">
                                        {item.weight ?? "—"}
                                    </td>
                                    <td className="py-2 text-right font-mono">
                                        {formatAmountPlain(item.rate)}
                                    </td>
                                    <td className="py-2 text-right font-mono font-semibold">
                                        {formatAmountPlain(item.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Summary */}
                    <section className="mt-3 flex justify-end">
                        <dl className="w-full max-w-xs space-y-0.5 text-xs">
                            {(freightLoadingCharges > 0 || discountAmt > 0) ? (
                                <div className="flex justify-between border-b border-gray-200 py-1.5">
                                    <dt className="text-gray-600">Subtotal</dt>
                                    <dd className="font-mono">{CURRENCY_SYMBOL} {formatAmountPlain(subtotal)}</dd>
                                </div>
                            ) : null}
                            {freightLoadingCharges > 0 ? (
                                <div className="flex justify-between py-1">
                                    <dt className="text-gray-600">Freight &amp; Loading charges</dt>
                                    <dd className="font-mono">{CURRENCY_SYMBOL} {formatAmountPlain(freightLoadingCharges)}</dd>
                                </div>
                            ) : null}
                            {discountAmt > 0 ? (
                                <div className="flex justify-between py-1 text-green-700">
                                    <dt>Discount</dt>
                                    <dd className="font-mono">− {CURRENCY_SYMBOL} {formatAmountPlain(discountAmt)}</dd>
                                </div>
                            ) : null}
                            <div className="flex justify-between border-b border-gray-200 py-1.5">
                                <dt className="font-semibold">Total</dt>
                                <dd className="font-mono font-semibold">
                                    {CURRENCY_SYMBOL} {formatAmountPlain(purchase.total_amount)}
                                </dd>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <dt className="text-gray-600">Paid</dt>
                                <dd className="font-mono">
                                    {CURRENCY_SYMBOL} {formatAmountPlain(purchase.paid_amount)}
                                </dd>
                            </div>
                            <div
                                className={`flex justify-between py-2 ${
                                    payable > 0
                                        ? "border-t-2 border-gray-900 text-sm font-bold"
                                        : "border-t border-gray-200"
                                }`}
                            >
                                <dt>{payable > 0 ? "Balance due" : "Paid"}</dt>
                                <dd className="font-mono">
                                    {CURRENCY_SYMBOL} {formatAmountPlain(payable)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* Spacer pushes signatures + footer to the bottom of the page */}
                    <div className="flex-1" />

                    {/* Signatures */}
                    <section className="mt-8 grid grid-cols-2 gap-8 pt-6">
                        <div>
                            <div className="mb-1 border-b border-gray-400" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Prepared by
                            </p>
                            {purchase.prepared_by ? (
                                <p className="mt-0.5 text-xs font-medium text-gray-700">
                                    {purchase.prepared_by}
                                </p>
                            ) : null}
                        </div>
                        <div>
                            <div className="mb-1 border-b border-gray-400" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Approved by
                            </p>
                            {purchase.approved_by ? (
                                <p className="mt-0.5 text-xs font-medium text-gray-700">
                                    {purchase.approved_by}
                                </p>
                            ) : null}
                        </div>
                    </section>

                    <footer className="mt-6 border-t border-gray-200 pt-4 text-center text-[10px] text-gray-500">
                        <p>Thank you for your business.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
