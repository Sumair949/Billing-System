"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ChangePasswordFormState = {
    error?: string;
    fieldErrors?: { password?: string };
    success?: boolean;
};

export async function adminChangePasswordAction(
    userId: string,
    _prev: ChangePasswordFormState,
    formData: FormData,
): Promise<ChangePasswordFormState> {
    const adminUser = await requireAdmin();

    const password = formData.get("password");
    if (typeof password !== "string" || password.length < 8)
        return { fieldErrors: { password: "Password must be at least 8 characters." } };
    if (password.length > 128)
        return { fieldErrors: { password: "Password is too long." } };
    if (checkRateLimit(adminUser.id, "password_change", 5))
        return { error: "Too many requests. Please wait a moment and try again." };

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) {
        console.error("[adminChangePasswordAction]", error);
        return { error: "Could not update password. Please try again." };
    }

    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
}
