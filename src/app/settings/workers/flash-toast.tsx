"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, { message: string; type: "success" | "info" }> = {
    "worker-created": { message: "Worker created.", type: "success" },
    "worker-enabled": { message: "Worker enabled.", type: "success" },
    "worker-disabled": { message: "Worker disabled.", type: "info" },
};

export function WorkersFlashToast() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
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
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, searchParams, router]);

    return null;
}
