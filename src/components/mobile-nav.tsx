"use client";

import {
    LayoutDashboard,
    Menu,
    Receipt,
    ShieldCheck,
    Wallet,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/nav-link";

export function MobileNav({ admin }: { admin: boolean }) {
    const [open, setOpen] = useState(false);

    // Lock body scroll while the drawer is open; also close on Escape.
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                aria-expanded={open}
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-header-foreground/90 transition hover:bg-header-foreground/10 md:hidden"
            >
                <Menu className="h-5 w-5" aria-hidden />
            </button>

            {open ? (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                        aria-hidden
                    />
                    <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto bg-sidebar shadow-xl">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Workspace
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close menu"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted"
                            >
                                <X className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                        <ul
                            className="space-y-1 p-3"
                            onClick={() => setOpen(false)}
                        >
                            <li>
                                <NavLink
                                    href="/"
                                    label="Dashboard"
                                    icon={<LayoutDashboard className="h-5 w-5" />}
                                />
                            </li>
                            <li>
                                <NavLink
                                    href="/bills"
                                    label="Bills"
                                    icon={<Receipt className="h-5 w-5" />}
                                />
                            </li>
                            <li>
                                <NavLink
                                    href="/pendings"
                                    label="Pendings"
                                    icon={<Wallet className="h-5 w-5" />}
                                />
                            </li>
                            {admin ? (
                                <li>
                                    <NavLink
                                        href="/admin"
                                        label="Admin"
                                        icon={<ShieldCheck className="h-5 w-5" />}
                                    />
                                </li>
                            ) : null}
                        </ul>
                    </aside>
                </div>
            ) : null}
        </>
    );
}
