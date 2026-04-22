import { notFound } from "next/navigation";
import { CURRENCY_SYMBOL, formatAmountPlain, formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PrintActions } from "./print-actions";

type ItemRow = {
    sr_no: number;
    description: string;
    quantity: string;
    weight: string | null;
    rate: string;
    amount: string;
};

function readShopName(meta: Record<string, unknown> | undefined): string {
    const v = meta?.shop_name;
    return typeof v === "string" && v.trim().length > 0 ? v : "Steel Shop";
}

export default async function PrintBillPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const [billRes, itemsRes, userRes] = await Promise.all([
        supabase
            .from("bills")
            .select(
                "id, bill_no, customer_name, customer_phone, bill_date, total_amount, received_amount",
            )
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("bill_items")
            .select("sr_no, description, quantity, weight, rate, amount")
            .eq("bill_id", id)
            .order("sr_no", { ascending: true }),
        supabase.auth.getUser(),
    ]);

    if (billRes.error || !billRes.data) notFound();

    const bill = billRes.data;
    const items = (itemsRes.data ?? []) as ItemRow[];
    const shopName = readShopName(userRes.data.user?.user_metadata);
    const pending = Math.max(
        0,
        Number(bill.total_amount) - Number(bill.received_amount),
    );

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
            <style>{`
                @media print {
                    @page { margin: 1.5cm; size: A4; }
                    html, body { background: white !important; }
                }
            `}</style>

            <div className="mx-auto max-w-3xl px-6 print:max-w-none print:px-0">
                <PrintActions />

                <div className="rounded-lg bg-white p-10 text-gray-900 shadow-sm ring-1 ring-gray-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
                    <header className="flex items-start justify-between border-b-2 border-gray-900 pb-6">
                        <div>
                            <h1 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                                {shopName}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Billing Statement
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold uppercase tracking-widest text-gray-700 sm:text-2xl">
                                Invoice
                            </p>
                            <p className="mt-1 font-mono text-base font-semibold">
                                {bill.bill_no}
                            </p>
                        </div>
                    </header>

                    <section className="grid grid-cols-2 gap-8 border-b border-gray-200 py-5">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Billed to
                            </p>
                            <p className="mt-1.5 text-base font-semibold">
                                {bill.customer_name}
                            </p>
                            {bill.customer_phone ? (
                                <p className="mt-1 font-mono text-sm text-gray-600">
                                    {bill.customer_phone}
                                </p>
                            ) : null}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                Bill date
                            </p>
                            <p className="mt-1.5 text-base font-semibold">
                                {formatDate(bill.bill_date)}
                            </p>
                        </div>
                    </section>

                    <table className="mt-6 w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-left text-[11px] uppercase tracking-wider text-gray-600">
                                <th className="w-12 py-2.5 font-semibold">Sr#</th>
                                <th className="py-2.5 font-semibold">
                                    Description
                                </th>
                                <th className="w-16 py-2.5 text-right font-semibold">
                                    Qty
                                </th>
                                <th className="w-24 py-2.5 text-right font-semibold">
                                    Weight
                                </th>
                                <th className="w-24 py-2.5 text-right font-semibold">
                                    Rate
                                </th>
                                <th className="w-28 py-2.5 text-right font-semibold">
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr
                                    key={item.sr_no}
                                    className="border-b border-gray-200 align-top"
                                >
                                    <td className="py-3 font-mono text-gray-500">
                                        {String(item.sr_no).padStart(2, "0")}
                                    </td>
                                    <td className="py-3 pr-4">
                                        {item.description}
                                    </td>
                                    <td className="py-3 text-right font-mono">
                                        {item.quantity}
                                    </td>
                                    <td className="py-3 text-right font-mono text-gray-600">
                                        {item.weight ?? "—"}
                                    </td>
                                    <td className="py-3 text-right font-mono">
                                        {formatAmountPlain(item.rate)}
                                    </td>
                                    <td className="py-3 text-right font-mono font-semibold">
                                        {formatAmountPlain(item.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <section className="mt-4 flex justify-end">
                        <dl className="w-full max-w-sm space-y-1 text-sm">
                            <div className="flex justify-between border-b border-gray-200 py-2">
                                <dt className="text-gray-600">Total</dt>
                                <dd className="font-mono font-semibold">
                                    {CURRENCY_SYMBOL}{" "}
                                    {formatAmountPlain(bill.total_amount)}
                                </dd>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 py-2">
                                <dt className="text-gray-600">Received</dt>
                                <dd className="font-mono">
                                    {CURRENCY_SYMBOL}{" "}
                                    {formatAmountPlain(bill.received_amount)}
                                </dd>
                            </div>
                            <div
                                className={`flex justify-between py-3 ${
                                    pending > 0
                                        ? "border-t-2 border-gray-900 text-base font-bold"
                                        : "border-t border-gray-200"
                                }`}
                            >
                                <dt>{pending > 0 ? "Balance due" : "Paid"}</dt>
                                <dd className="font-mono">
                                    {CURRENCY_SYMBOL}{" "}
                                    {formatAmountPlain(pending)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <footer className="mt-12 border-t border-gray-200 pt-5 text-center text-xs text-gray-500">
                        <p>Thank you for your business.</p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
