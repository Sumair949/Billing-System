"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation/auth";

export type AuthState = {
    error?: string;
    fieldErrors?: {
        email?: string;
        password?: string;
    };
};

function authFieldErrors(
    issues: readonly {
        readonly path: readonly PropertyKey[];
        readonly message: string;
    }[],
): AuthState["fieldErrors"] {
    const out: AuthState["fieldErrors"] = {};
    for (const issue of issues) {
        const raw = issue.path[0];
        if (typeof raw !== "string") continue;
        const key = raw as "email" | "password";
        if (!out[key]) out[key] = issue.message;
    }
    return out;
}

export async function loginAction(
    _prev: AuthState,
    formData: FormData,
): Promise<AuthState> {
    const parsed = credentialsSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });
    if (!parsed.success) {
        return { fieldErrors: authFieldErrors(parsed.error.issues) };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
        return { error: "Invalid email or password." };
    }

    redirect("/");
}

export async function logoutAction() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
}
