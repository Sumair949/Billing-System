"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateWorkerFormState = {
    error?: string;
    fieldErrors?: {
        display_name?: string;
        email?: string;
        password?: string;
    };
    success?: boolean;
};

export async function createWorkerAction(
    _prev: CreateWorkerFormState,
    formData: FormData,
): Promise<CreateWorkerFormState> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const display_name = (formData.get("display_name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    const fieldErrors: CreateWorkerFormState["fieldErrors"] = {};
    if (!display_name) fieldErrors.display_name = "Display name is required.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fieldErrors.email = "A valid email is required.";
    if (!password || password.length < 8)
        fieldErrors.password = "Password must be at least 8 characters.";
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

    const admin = createSupabaseAdminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: "worker",
            owner_id: user.id,
            display_name,
        },
    });

    if (createErr) {
        if (/already been registered|already exists/i.test(createErr.message))
            return { fieldErrors: { email: "An account with this email already exists." } };
        console.error("[createWorkerAction] createUser:", createErr);
        return { error: "Could not create worker account. Please try again." };
    }

    const { error: insertErr } = await admin.from("shop_workers").insert({
        owner_id: user.id,
        worker_user_id: created.user.id,
        display_name,
        is_active: true,
    });

    if (insertErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        console.error("[createWorkerAction] insert shop_workers:", insertErr);
        return { error: "Could not save worker. Please try again." };
    }

    revalidatePath("/settings/workers");
    redirect("/settings/workers?flash=worker-created");
}

export type ChangeWorkerPasswordFormState = {
    error?: string;
    fieldErrors?: { password?: string };
    success?: boolean;
};

export async function changeWorkerPasswordAction(
    workerId: string,
    _prev: ChangeWorkerPasswordFormState,
    formData: FormData,
): Promise<ChangeWorkerPasswordFormState> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const password = formData.get("password") as string;
    if (!password || password.length < 8)
        return { fieldErrors: { password: "Password must be at least 8 characters." } };
    if (checkRateLimit(user.id, "password_change", 5))
        return { error: "Too many requests. Please wait a moment and try again." };

    const admin = createSupabaseAdminClient();

    const { data: row } = await admin
        .from("shop_workers")
        .select("id")
        .eq("worker_user_id", workerId)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (!row) return { error: "Worker not found." };

    const { error } = await admin.auth.admin.updateUserById(workerId, { password });
    if (error) {
        console.error("[changeWorkerPasswordAction]", error);
        return { error: "Could not update password. Please try again." };
    }

    return { success: true };
}

export async function toggleWorkerAction(workerId: string, disable: boolean) {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = createSupabaseAdminClient();

    // Verify the worker belongs to this owner before acting
    const { data: row } = await admin
        .from("shop_workers")
        .select("id")
        .eq("worker_user_id", workerId)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (!row) throw new Error("Worker not found.");

    const { error: authErr } = await admin.auth.admin.updateUserById(workerId, {
        ban_duration: disable ? "876600h" : "none",
    });
    if (authErr)
        throw new Error(disable ? "Could not disable worker." : "Could not enable worker.");

    await admin
        .from("shop_workers")
        .update({ is_active: !disable })
        .eq("worker_user_id", workerId)
        .eq("owner_id", user.id);

    revalidatePath("/settings/workers");
    redirect(`/settings/workers?flash=${disable ? "worker-disabled" : "worker-enabled"}`);
}
