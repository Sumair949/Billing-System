"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { DateRange } from "@/lib/validation/bill";

const options: { value: DateRange; label: string }[] = [
    { value: "all", label: "All time" },
    { value: "month", label: "This month" },
    { value: "last-month", label: "Last month" },
    { value: "last-30", label: "Last 30 days" },
];

export function DateRangeFilter() {
    const searchParams = useSearchParams();
    const current = (searchParams.get("range") as DateRange) ?? "all";

    const makeHref = (value: DateRange) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") {
            params.delete("range");
        } else {
            params.set("range", value);
        }
        params.delete("page");
        const qs = params.toString();
        return qs ? `/bills?${qs}` : "/bills";
    };

    return (
        <div
            className="inline-flex rounded-lg bg-muted p-1"
            role="group"
            aria-label="Date range filter"
        >
            {options.map((opt) => {
                const active = opt.value === current;
                return (
                    <Link
                        key={opt.value}
                        href={makeHref(opt.value)}
                        scroll={false}
                        aria-pressed={active}
                        className={[
                            "rounded-md px-3 py-1.5 text-xs font-medium transition",
                            active
                                ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                    >
                        {opt.label}
                    </Link>
                );
            })}
        </div>
    );
}
