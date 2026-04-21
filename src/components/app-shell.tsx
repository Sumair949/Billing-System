import {
    KeyRound,
    LayoutDashboard,
    LogOut,
    Receipt,
    ShieldCheck,
    User as UserIcon,
    Wallet,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { Logo } from "@/components/logo";
import { isAdminEmail } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readShopName(
    metadata: Record<string, unknown> | undefined,
): string | null {
    const value = metadata?.shop_name;
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function AppShell({ children }: { children: React.ReactNode }) {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const shopName = readShopName(user?.user_metadata);
    const email = user?.email ?? "";
    const admin = isAdminEmail(email);

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="bg-header text-header-foreground shadow-sm">
                <div className="flex h-16 w-full items-center gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6">
                    <div className="flex items-center gap-2">
                        <MobileNav admin={admin} />
                        <Logo className="h-8 w-auto sm:h-11" priority />
                    </div>

                    <div className="min-w-0 flex-1 text-center md:flex-none">
                        <h1 className="truncate text-base font-bold tracking-tight sm:text-xl md:text-2xl">
                            {admin ? "Admin Console" : shopName ?? "Steel Shop Billing"}
                        </h1>
                        <p className="hidden truncate text-xs text-header-foreground/70 sm:block sm:text-sm">
                            {admin
                                ? "Manage users and review shop activity"
                                : "Billing Management System"}
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <div className="hidden items-center gap-3 pr-2 lg:flex">
                            <div className="text-right leading-tight">
                                <p className="text-sm font-semibold">{email}</p>
                                <p className="text-xs text-header-foreground/70">
                                    {admin ? "Admin" : "Owner"}
                                </p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-header-foreground/10 ring-1 ring-header-foreground/15">
                                <UserIcon className="h-5 w-5" aria-hidden />
                            </div>
                        </div>
                        <Link
                            href="/account/password"
                            aria-label="Change password"
                            className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-header-foreground/90 transition hover:bg-header-foreground/10 sm:px-3"
                        >
                            <KeyRound className="h-4 w-4" aria-hidden />
                            <span className="hidden xl:inline">Change Password</span>
                        </Link>
                        <form action={logoutAction}>
                            <button
                                type="submit"
                                aria-label="Sign out"
                                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-header-foreground/90 transition hover:bg-header-foreground/10 sm:px-3"
                            >
                                <LogOut className="h-4 w-4" aria-hidden />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">
                    <nav className="sticky top-0 flex flex-col gap-6 p-5">
                        <div>
                            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Workspace
                            </p>
                            <ul className="space-y-1">
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
                        </div>
                    </nav>
                </aside>

                <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
                    <div className="w-full">{children}</div>
                </main>
            </div>
        </div>
    );
}
