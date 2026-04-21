"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type AuthState } from "../actions";

const initialState: AuthState = {};

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(loginAction, initialState);

    return (
        <>
            <div className="flex flex-col items-center gap-3">
                <Logo className="h-12 w-auto" priority />
                <p className="text-xs uppercase tracking-[0.2em] text-auth-muted">
                    Steel Shop Billing
                </p>
            </div>

            <form action={formAction} className="space-y-5" noValidate>
                <div className="space-y-2">
                    <Label htmlFor="email" variant="dark">
                        Email
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        variant="dark"
                        placeholder="owner@example.com"
                        aria-invalid={state.fieldErrors?.email ? true : undefined}
                    />
                    <FieldError message={state.fieldErrors?.email} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" variant="dark">
                        Password
                    </Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        variant="dark"
                        placeholder="••••••••"
                        aria-invalid={state.fieldErrors?.password ? true : undefined}
                    />
                    <FieldError message={state.fieldErrors?.password} />
                </div>

                {state.error ? (
                    <p role="alert" className="text-sm text-red-300">
                        {state.error}
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground font-medium transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <LogIn className="h-4 w-4" aria-hidden />
                    {pending ? "Signing in…" : "Sign In"}
                </button>
            </form>

            <p className="text-center text-xs text-auth-muted">
                Access is invite-only. Contact your admin for a new account.
            </p>
        </>
    );
}
