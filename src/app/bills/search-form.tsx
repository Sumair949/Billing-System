"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

type Props = {
    className?: string;
};

export function SearchForm({ className = "" }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(() => searchParams.get("q") ?? "");
    const [, startTransition] = useTransition();

    useEffect(() => {
        const handle = setTimeout(() => {
            const current = searchParams.get("q") ?? "";
            if (value === current) return;
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set("q", value);
            } else {
                params.delete("q");
            }
            params.delete("page");
            startTransition(() => {
                router.replace(`/bills?${params.toString()}`);
            });
        }, 250);
        return () => clearTimeout(handle);
    }, [value, router, searchParams]);

    return (
        <label className="block">
            <span className="sr-only">Search by bill number or description</span>
            <Input
                type="search"
                name="q"
                placeholder="Search by bill number or description…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={100}
                autoComplete="off"
                className={className}
            />
        </label>
    );
}
