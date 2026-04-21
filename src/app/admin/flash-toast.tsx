"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, { message: string; type: "success" | "info" }> = {
    "user-created": { message: "User created.", type: "success" },
    "user-deleted": { message: "User deleted.", type: "success" },
    "user-disabled": { message: "User disabled.", type: "info" },
    "user-enabled": { message: "User enabled.", type: "success" },
};

export function AdminFlashToast() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const firedRef = useRef<string | null>(null);

    useEffect(() => {
        const flash = searchParams.get("flash");
        if (!flash) return;
        if (firedRef.current === flash) return;
        firedRef.current = flash;

        const entry = MESSAGES[flash];
        if (entry) {
            if (entry.type === "success") toast.success(entry.message, { id: flash });
            else toast.info(entry.message, { id: flash });
        }

        const params = new URLSearchParams(searchParams.toString());
        params.delete("flash");
        const qs = params.toString();
        router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    }, [searchParams, router]);

    return null;
}
