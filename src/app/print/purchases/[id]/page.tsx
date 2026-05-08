import { notFound } from "next/navigation";
import { CURRENCY_SYMBOL, formatAmountPlain, formatDate } from "@/lib/format";
import { fetchShopInfo } from "@/lib/shop";
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
    const shop = await fetchShopInfo(userRes.data.user ?? null);
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
                <PrintActions filename={`Purchase-${purchase.purchase_no}`} format="a5" />

                <div id="print-card" className="relative flex flex-col rounded-lg bg-white text-gray-900 shadow-md ring-1 ring-gray-200 print:min-h-[20.5cm] print:rounded-none print:shadow-none print:ring-0">
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

                    <div className="flex flex-1 flex-col px-7 pb-5 pt-5 print:px-4 print:pb-3 print:pt-3">

                        <header className="relative border-b-2 border-gray-200 pb-3 print:border-gray-900">
                            <div className="text-center">
                                <h1 className="text-xl font-extrabold uppercase tracking-tight text-gray-900 sm:text-2xl">
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
                            </div>
                            <div className="absolute right-0 top-0 text-right">
                                <div className="inline-block rounded bg-gray-900 px-3 py-1.5 print:bg-transparent print:border-2 print:border-black">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-300 print:text-black">Purchase</p>
                                    <p className="mt-0.5 font-mono text-sm font-bold text-white print:text-black">{purchase.purchase_no}</p>
                                </div>
                                <p className="mt-1.5 text-[11px] text-gray-500 print:text-gray-800">{formatDate(purchase.purchase_date)}</p>
                            </div>
                        </header>

                        <section className="py-3">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 print:text-gray-700">Supplier</p>
                            <p className="text-sm font-bold text-gray-900">{purchase.supplier_name}</p>
                        </section>

                        <div className="border-t border-gray-200 print:border-gray-500" />

                        <table className="mt-3 w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-900 text-left text-[9px] uppercase tracking-wider text-gray-200 print:bg-transparent print:border-b-2 print:border-black print:text-black">
                                    <th className="w-10 py-1.5 pl-2 font-semibold">Sr#</th>
                                    <th className="py-1.5 pl-2 font-semibold">Description</th>
                                    <th className="w-14 py-1.5 text-right font-semibold">Qty</th>
                                    <th className="w-14 py-1.5 text-right font-semibold">Wt.</th>
                                    <th className="w-20 py-1.5 text-right font-semibold">Rate</th>
                                    <th className="w-22 py-1.5 pl-4 pr-2 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr
                                        key={item.sr_no}
                                        className={`border-b border-gray-100 align-top print:border-gray-300 ${i % 2 === 1 ? "bg-gray-50/60 print:bg-white" : ""}`}
                                    >
                                        <td className="py-1.5 pl-2 font-mono text-gray-400 print:text-gray-700">
                                            {String(item.sr_no).padStart(2, "0")}
                                        </td>
                                        <td className="py-1.5 pl-2 pr-2 font-medium print:text-black">{item.description}</td>
                                        <td className="py-1.5 text-right font-mono text-gray-600 print:text-black">{item.quantity ?? "—"}</td>
                                        <td className="py-1.5 text-right font-mono text-gray-600 print:text-black">{item.weight ?? "—"}</td>
                                        <td className="py-1.5 text-right font-mono print:text-black">{formatAmountPlain(item.rate)}</td>
                                        <td className="py-1.5 pl-4 pr-2 text-right font-mono font-semibold print:text-black">{formatAmountPlain(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <section className="mt-3 flex justify-end">
                            <div className="w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs print:border-gray-400 print:bg-white">
                                {(freightLoadingCharges > 0 || discountAmt > 0) ? (
                                    <div className="flex justify-between border-b border-gray-200 pb-2 mb-2 print:border-gray-400">
                                        <span className="text-gray-500 print:text-gray-800">Subtotal</span>
                                        <span className="font-mono print:text-black">{CURRENCY_SYMBOL} {formatAmountPlain(subtotal)}</span>
                                    </div>
                                ) : null}
                                {freightLoadingCharges > 0 ? (
                                    <div className="flex justify-between py-0.5">
                                        <span className="text-gray-500 print:text-gray-800">Freight &amp; Loading</span>
                                        <span className="font-mono print:text-black">{CURRENCY_SYMBOL} {formatAmountPlain(freightLoadingCharges)}</span>
                                    </div>
                                ) : null}
                                {discountAmt > 0 ? (
                                    <div className="flex justify-between py-0.5 text-green-700 print:text-black">
                                        <span>Discount</span>
                                        <span className="font-mono">− {CURRENCY_SYMBOL} {formatAmountPlain(discountAmt)}</span>
                                    </div>
                                ) : null}
                                <div className="mt-2 flex justify-between border-t border-gray-300 pt-2 print:border-gray-600">
                                    <span className="font-semibold text-gray-700 print:text-black">Total</span>
                                    <span className="font-mono font-semibold print:text-black">
                                        {CURRENCY_SYMBOL} {formatAmountPlain(purchase.total_amount)}
                                    </span>
                                </div>
                                <div className="mt-1 flex justify-between py-0.5">
                                    <span className="text-gray-500 print:text-gray-800">Paid</span>
                                    <span className="font-mono text-gray-600 print:text-black">
                                        {CURRENCY_SYMBOL} {formatAmountPlain(purchase.paid_amount)}
                                    </span>
                                </div>
                                <div
                                    className={`mt-2 flex justify-between rounded px-2 py-2 text-sm font-bold print:rounded-none ${
                                        payable > 0
                                            ? "bg-gray-900 text-white print:bg-transparent print:text-black print:border-t-2 print:border-black"
                                            : "bg-green-50 text-green-700 print:bg-transparent print:text-black print:border-t print:border-gray-600"
                                    }`}
                                >
                                    <span>{payable > 0 ? "Balance Due" : "Fully Paid"}</span>
                                    <span className="font-mono">{CURRENCY_SYMBOL} {formatAmountPlain(payable)}</span>
                                </div>
                            </div>
                        </section>

                        <div className="flex-1 py-4" />

                        <section className="flex justify-between text-[11px] text-gray-600 print:text-gray-900">
                            <p>
                                <span className="font-semibold text-gray-700 print:text-black">Prepared By:</span>
                                {purchase.prepared_by ? ` ${purchase.prepared_by}` : ""}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-700 print:text-black">Approved By:</span>
                                {purchase.approved_by ? ` ${purchase.approved_by}` : ""}
                            </p>
                        </section>

                        <footer className="mt-4">
                            <div className="border-t border-gray-200 print:border-gray-600" />
                            <p className="mt-2 text-center text-[10px] text-gray-400 print:text-gray-800">
                                Thank you for your business.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
