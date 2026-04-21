"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation/password";

export type PasswordFormState = {
    error?: string;
    fieldErrors?: Partial<
        Record<"current_password" | "new_password" | "confirm_password", string>
    >;
};

export async function changePasswordAction(
    _prev: PasswordFormState,
    formData: FormData,
): Promise<PasswordFormState> {
    const parsed = changePasswordSchema.safeParse({
        current_password: formData.get("current_password"),
        new_password: formData.get("new_password"),
        confirm_password: formData.get("confirm_password"),
    });

    if (!parsed.success) {
        const out: PasswordFormState["fieldErrors"] = {};
        for (const issue of parsed.error.issues) {
            const raw = issue.path[0];
            if (typeof raw !== "string") continue;
            const key = raw as keyof NonNullable<PasswordFormState["fieldErrors"]>;
            if (!out[key]) out[key] = issue.message;
        }
        return { fieldErrors: out };
    }

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
        redirect("/login");
    }

    // Re-verify the current password before letting it be changed. Supabase
    // doesn't require this for `updateUser` if the session is valid, but it's
    // a standard security expectation and prevents an attacker with a stolen
    // session from rotating the password unchallenged.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.current_password,
    });
    if (verifyError) {
        return {
            fieldErrors: { current_password: "Current password is incorrect." },
        };
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.new_password,
    });
    if (updateError) {
        return { error: updateError.message };
    }

    redirect("/bills?flash=password-changed");
}
