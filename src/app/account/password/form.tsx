"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PasswordFormState } from "../actions";

const initialState: PasswordFormState = {};

type Props = {
    action: (
        state: PasswordFormState,
        formData: FormData,
    ) => Promise<PasswordFormState>;
};

export function ChangePasswordForm({ action }: Props) {
    const [state, formAction, pending] = useActionState(action, initialState);

    return (
        <form
            action={formAction}
            className="space-y-5 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border"
            noValidate
        >
            <div className="space-y-2">
                <Label htmlFor="current_password">Current password</Label>
                <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    required
                    aria-invalid={
                        state.fieldErrors?.current_password ? true : undefined
                    }
                />
                <FieldError message={state.fieldErrors?.current_password} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-invalid={state.fieldErrors?.new_password ? true : undefined}
                />
                <p className="text-xs text-muted-foreground">
                    At least 8 characters.
                </p>
                <FieldError message={state.fieldErrors?.new_password} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-invalid={
                        state.fieldErrors?.confirm_password ? true : undefined
                    }
                />
                <FieldError message={state.fieldErrors?.confirm_password} />
            </div>

            {state.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {state.error}
                </p>
            ) : null}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {pending ? "Saving…" : "Update password"}
                </button>
                <Link
                    href="/bills"
                    className="inline-flex items-center justify-center rounded-md bg-surface px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-border hover:bg-muted"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
