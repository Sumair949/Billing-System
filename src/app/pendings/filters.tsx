"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PayFilter = "all" | "partial" | "unpaid";

const options: { value: PayFilter; label: string; dot?: string }[] = [
    { value: "all", label: "All" },
    { value: "partial", label: "Partially paid", dot: "bg-sky-500" },
    { value: "unpaid", label: "Nothing paid", dot: "bg-amber-500" },
];

export function PendingsFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
    const initial = useRef(true);

    const current = (searchParams.get("pay") as PayFilter) ?? "all";

    useEffect(() => {
        if (initial.current) {
            initial.current = false;
            return;
        }
        const handle = window.setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            const trimmed = query.trim();
            if (trimmed) params.set("q", trimmed);
            else params.delete("q");
            const qs = params.toString();
            router.replace(qs ? `/pendings?${qs}` : "/pendings", {
                scroll: false,
            });
        }, 250);
        return () => window.clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const makeHref = (value: PayFilter) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") params.delete("pay");
        else params.set("pay", value);
        const qs = params.toString();
        return qs ? `/pendings?${qs}` : "/pendings";
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
                className="inline-flex w-max rounded-lg bg-muted p-1"
                role="group"
                aria-label="Payment status filter"
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

            <div className="relative w-full sm:w-80">
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                />
                <input
                    type="search"
                    placeholder="Search customer or bill no…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-md bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>
        </div>
    );
}
