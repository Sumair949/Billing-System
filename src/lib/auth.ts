import "server-only";

import { redirect } from "next/navigation";
import { adminEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return adminEmails().includes(email.trim().toLowerCase());
}

// Ensures the request is from an admin. Redirects unauthenticated users to
// /login; for authenticated-but-non-admin users, 404 so the presence of an
// admin console isn't advertised.
export async function requireAdmin() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");
    if (!isAdminEmail(user.email)) {
        // Signal "no such page" rather than "permission denied" to avoid
        // leaking the admin surface area to regular users.
        const { notFound } = await import("next/navigation");
        notFound();
    }

    return user;
}
