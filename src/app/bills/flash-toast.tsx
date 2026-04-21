"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, { message: string; type: "success" | "info" }> = {
    "bill-created": { message: "Bill saved.", type: "success" },
    "bill-updated": { message: "Bill updated.", type: "success" },
    "bill-deleted": { message: "Bill deleted.", type: "success" },
    "status-paid": { message: "Marked as paid.", type: "success" },
    "status-unpaid": { message: "Marked as unpaid.", type: "info" },
    "password-changed": { message: "Password updated.", type: "success" },
};

export function FlashToast() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    // Strict Mode runs effects twice in dev; this ref ensures each distinct
    // flash value fires the toast + URL-strip exactly once.
    const firedRef = useRef<string | null>(null);

    useEffect(() => {
        const flash = searchParams.get("flash");
        if (!flash) return;
        if (firedRef.current === flash) return;
        firedRef.current = flash;

        const entry = MESSAGES[flash];
        if (entry) {
            // `id: flash` dedupes inside sonner as a belt-and-suspenders guard.
            if (entry.type === "success") toast.success(entry.message, { id: flash });
            else toast.info(entry.message, { id: flash });
        }

        const params = new URLSearchParams(searchParams.toString());
        params.delete("flash");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, searchParams, router]);

    return null;
}
