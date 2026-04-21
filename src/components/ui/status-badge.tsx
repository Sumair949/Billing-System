import type { BillStatus } from "@/lib/supabase/types";

const styles: Record<BillStatus, string> = {
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    partial: "bg-sky-50 text-sky-700 ring-sky-200",
    unpaid: "bg-amber-50 text-amber-700 ring-amber-200",
};

const dots: Record<BillStatus, string> = {
    paid: "bg-emerald-500",
    partial: "bg-sky-500",
    unpaid: "bg-amber-500",
};

const labels: Record<BillStatus, string> = {
    paid: "Paid",
    partial: "Partial",
    unpaid: "Unpaid",
};

export function StatusBadge({ status }: { status: BillStatus }) {
    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                styles[status],
            ].join(" ")}
        >
            <span
                className={["h-1.5 w-1.5 rounded-full", dots[status]].join(" ")}
                aria-hidden
            />
            {labels[status]}
        </span>
    );
}
