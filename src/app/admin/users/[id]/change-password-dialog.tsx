"use client";

import * as DialogPrimitive from "@radix-ui/react-alert-dialog";
import { KeyRound, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChangePasswordFormState } from "./admin-actions";

const initialState: ChangePasswordFormState = {};

export function ChangePasswordDialog({
    action,
}: {
    action: (
        state: ChangePasswordFormState,
        formData: FormData,
    ) => Promise<ChangePasswordFormState>;
}) {
    const [open, setOpen] = useState(false);
    const [state, formAction, pending] = useActionState(action, initialState);

    useEffect(() => {
        if (!pending && state.success) setOpen(false);
    }, [pending, state.success]);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-surface px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-border transition hover:bg-muted"
                >
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Change password
                </button>
            </DialogPrimitive.Trigger>

            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-2xl ring-1 ring-border">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
                                Change password
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="text-sm text-muted-foreground">
                                Set a new password for this account. The user can change it
                                after logging in.
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Cancel
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" aria-hidden />
                        </DialogPrimitive.Cancel>
                    </div>

                    <form action={formAction} className="space-y-4" noValidate>
                        <div className="space-y-2">
                            <Label htmlFor="cp-password">New password</Label>
                            <Input
                                id="cp-password"
                                name="password"
                                type="text"
                                autoComplete="off"
                                required
                                minLength={8}
                                placeholder="At least 8 characters"
                                aria-invalid={state.fieldErrors?.password ? true : undefined}
                            />
                            <FieldError message={state.fieldErrors?.password} />
                        </div>

                        {state.error ? (
                            <p role="alert" className="text-sm text-destructive">
                                {state.error}
                            </p>
                        ) : null}

                        <div className="flex justify-end gap-2 pt-2">
                            <DialogPrimitive.Cancel className="inline-flex items-center justify-center rounded-md bg-surface px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-border transition hover:bg-muted">
                                Cancel
                            </DialogPrimitive.Cancel>
                            <button
                                type="submit"
                                disabled={pending}
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <KeyRound className="h-4 w-4" aria-hidden />
                                {pending ? "Saving…" : "Set password"}
                            </button>
                        </div>
                    </form>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
