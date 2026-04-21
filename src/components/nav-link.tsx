"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
    href: string;
    label: string;
    icon: ReactNode;
    exact?: boolean;
};

export function NavLink({ href, label, icon, exact }: Props) {
    const pathname = usePathname();
    const isActive = exact
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);

    return (
        <Link
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={[
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition",
                isActive
                    ? "bg-sidebar-active text-sidebar-active-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
        >
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
                {icon}
            </span>
            <span>{label}</span>
        </Link>
    );
}
