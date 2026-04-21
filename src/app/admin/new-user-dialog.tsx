"use client";

import * as DialogPrimitive from "@radix-ui/react-alert-dialog";
import { Plus, UserPlus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction, type CreateUserFormState } from "./actions";

const initialState: CreateUserFormState = {};

export function NewUserDialog() {
    const [open, setOpen] = useState(false);
    const [state, formAction, pending] = useActionState(
        createUserAction,
        initialState,
    );

    // Close automatically if a redirect/success resolved without validation errors.
    // On failure we keep the dialog open so the user can read / correct.
    useEffect(() => {
        if (pending) return;
        if (state.error || state.fieldErrors) return;
    }, [pending, state]);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" aria-hidden />
                    New user
                </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-2xl ring-1 ring-border">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
                                Create a new user
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="text-sm text-muted-foreground">
                                The user can log in immediately with the email and password
                                you set here.
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
                            <Label htmlFor="new-user-shop">Shop name</Label>
                            <Input
                                id="new-user-shop"
                                name="shop_name"
                                type="text"
                                required
                                maxLength={100}
                                placeholder="Ahmed Steel Traders"
                                aria-invalid={
                                    state.fieldErrors?.shop_name ? true : undefined
                                }
                            />
                            <FieldError message={state.fieldErrors?.shop_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-user-email">Email</Label>
                            <Input
                                id="new-user-email"
                                name="email"
                                type="email"
                                autoComplete="off"
                                required
                                placeholder="owner@example.com"
                                aria-invalid={state.fieldErrors?.email ? true : undefined}
                            />
                            <FieldError message={state.fieldErrors?.email} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-user-password">Initial password</Label>
                            <Input
                                id="new-user-password"
                                name="password"
                                type="text"
                                autoComplete="off"
                                required
                                minLength={8}
                                placeholder="At least 8 characters"
                                aria-invalid={
                                    state.fieldErrors?.password ? true : undefined
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Share this with the user. They can change it after logging in.
                            </p>
                            <FieldError message={state.fieldErrors?.password} />
                        </div>

                        {state.error ? (
                            <p role="alert" className="text-sm text-destructive">
                                {state.error}
                            </p>
                        ) : null}

                        <div className="mt-6 flex justify-end gap-2">
                            <DialogPrimitive.Cancel className="inline-flex items-center justify-center rounded-md bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted">
                                Cancel
                            </DialogPrimitive.Cancel>
                            <button
                                type="submit"
                                disabled={pending}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <UserPlus className="h-4 w-4" aria-hidden />
                                {pending ? "Creating…" : "Create user"}
                            </button>
                        </div>
                    </form>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
