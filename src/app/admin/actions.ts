"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: disable ? "876600h" : "none",
    });

    if (error) {
        console.error("[setUserDisabledAction] updateUserById failed:", error);
        throw new Error(disable ? "Could not disable user." : "Could not enable user.");
    }

    revalidatePath("/admin");
    redirect(`/admin?flash=${disable ? "user-disabled" : "user-enabled"}`);
}

export async function setWorkerDisabledAction(
    ownerId: string,
    workerId: string,
    disable: boolean,
) {
    await requireAdmin();

    const adminClient = createSupabaseAdminClient();

    const { error: authErr } = await adminClient.auth.admin.updateUserById(workerId, {
        ban_duration: disable ? "876600h" : "none",
    });

    if (authErr) {
        console.error("[setWorkerDisabledAction] updateUserById failed:", authErr);
        throw new Error(disable ? "Could not disable worker." : "Could not enable worker.");
    }

    await adminClient
        .from("shop_workers")
        .update({ is_active: !disable })
        .eq("worker_user_id", workerId)
        .eq("owner_id", ownerId);

    revalidatePath(`/admin/users/${ownerId}`);
    redirect(`/admin/users/${ownerId}?flash=${disable ? "worker-disabled" : "worker-enabled"}`);
}

export async function deleteWorkerAction(ownerId: string, workerId: string) {
    await requireAdmin();

    const adminClient = createSupabaseAdminClient();

    // Deleting the Auth user cascades to shop_workers via ON DELETE CASCADE.
    const { error } = await adminClient.auth.admin.deleteUser(workerId);
    if (error) {
        console.error("[deleteWorkerAction] deleteUser failed:", error);
        throw new Error("Could not delete worker.");
    }

    revalidatePath(`/admin/users/${ownerId}`);
    redirect(`/admin/users/${ownerId}?flash=worker-deleted`);
}
