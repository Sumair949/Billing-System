"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUserSchema } from "@/lib/validation/admin";

export type CreateUserFormState = {
    error?: string;
    fieldErrors?: Partial<Record<"email" | "password" | "shop_name", string>>;
};

export async function createUserAction(
    _prev: CreateUserFormState,
    formData: FormData,
): Promise<CreateUserFormState> {
    await requireAdmin();

    const parsed = createUserSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        shop_name: formData.get("shop_name"),
    });

    if (!parsed.success) {
        const out: CreateUserFormState["fieldErrors"] = {};
        for (const issue of parsed.error.issues) {
            const raw = issue.path[0];
            if (typeof raw !== "string") continue;
            const key = raw as "email" | "password" | "shop_name";
            if (!out[key]) out[key] = issue.message;
        }
        return { fieldErrors: out };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: { shop_name: parsed.data.shop_name },
    });

    if (error) {
        if (/already been registered|already exists/i.test(error.message)) {
            return { fieldErrors: { email: "A user with this email already exists." } };
        }
        console.error("[createUserAction] createUser failed:", error);
        return { error: "Could not create user. Please try again." };
    }

    revalidatePath("/admin");
    redirect("/admin?flash=user-created");
}

export async function setUserDisabledAction(userId: string, disable: boolean) {
    const admin = await requireAdmin();

    if (userId === admin.id) {
        throw new Error("You cannot disable your own admin account.");
    }

    const adminClient = createSupabaseAdminClient();
    const { data: target } = await adminClient.auth.admin.getUserById(userId);
    if (target?.user && isAdminEmail(target.user.email)) {
        throw new Error("Cannot disable another admin user.");
    }

    // Supabase's `ban_duration` locks a user out at the auth layer. Their
    // rows stay intact; passing "none" lifts the ban. ~100 years acts as
    // "indefinite" for our purposes.
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: disable ? "876600h" : "none",
    });

    if (error) {
        console.error("[setUserDisabledAction] updateUserById failed:", error);
        throw new Error(
            disable ? "Could not disable user." : "Could not enable user.",
        );
    }

    revalidatePath("/admin");
    redirect(`/admin?flash=${disable ? "user-disabled" : "user-enabled"}`);
}

export async function deleteUserAction(userId: string) {
    const admin = await requireAdmin();

    // Hard-block self-delete so the last admin can't accidentally lock
    // themselves out of the admin console.
    if (userId === admin.id) {
        throw new Error("You cannot delete your own admin account.");
    }

    // Also refuse to delete another admin through this UI. Admin membership
    // is controlled by the ADMIN_EMAILS env var, not this UI, but deleting an
    // admin user via the API would strand the ADMIN_EMAILS config.
    const adminClient = createSupabaseAdminClient();
    const { data: target } = await adminClient.auth.admin.getUserById(userId);
    if (target?.user && isAdminEmail(target.user.email)) {
        throw new Error("Cannot delete an admin user from this screen.");
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
        console.error("[deleteUserAction] deleteUser failed:", error);
        throw new Error("Could not delete user.");
    }

    // bills rows are removed automatically by the FK `on delete cascade`
    // defined in supabase/migrations/0001_init.sql.

    revalidatePath("/admin");
    redirect("/admin?flash=user-deleted");
}
