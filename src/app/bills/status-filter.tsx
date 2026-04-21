"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { StatusFilter } from "@/lib/validation/bill";

const options: { value: StatusFilter; label: string; dot?: string }[] = [
    { value: "all", label: "All" },
    { value: "paid", label: "Paid", dot: "bg-emerald-500" },
    { value: "partial", label: "Partial", dot: "bg-sky-500" },
    { value: "unpaid", label: "Unpaid", dot: "bg-amber-500" },
];

export function StatusFilterPills() {
    const searchParams = useSearchParams();
    const current = (searchParams.get("status") as StatusFilter) ?? "all";

    const makeHref = (value: StatusFilter) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") {
            params.delete("status");
        } else {
            params.set("status", value);
        }
        params.delete("page");
        const qs = params.toString();
        return qs ? `/bills?${qs}` : "/bills";
    };

    return (
        <div
            className="inline-flex rounded-lg bg-muted p-1"
            role="group"
            aria-label="Status filter"
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
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                            active
                                ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                    >
                        {opt.dot ? (
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${opt.dot}`}
                                aria-hidden
                            />
                        ) : null}
                        {opt.label}
                    </Link>
                );
            })}
        </div>
    );
}
