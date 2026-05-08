"use client";

import { UserPlus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { createWorkerAction, type CreateWorkerFormState } from "./actions";

const initialState: CreateWorkerFormState = {};

export function AddWorkerDialog() {
    const [open, setOpen] = useState(false);
    const [state, formAction, pending] = useActionState(createWorkerAction, initialState);

    // Close on successful redirect (state resets)
    useEffect(() => {
        if (state.success) setOpen(false);
    }, [state.success]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
                <UserPlus className="h-4 w-4" aria-hidden />
                Add Worker
            </button>

            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Add Worker</DialogTitle>
                    <DialogDescription>
                        Create a login for a worker. They can sign in and create bills on behalf
                        of your shop.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="space-y-4 px-4 pb-6 pt-4 sm:px-6">
                    <div className="space-y-2">
                        <Label htmlFor="aw-name">Display name</Label>
                        <Input
                            id="aw-name"
                            name="display_name"
                            type="text"
                            placeholder="e.g. Ali Raza"
                            autoComplete="off"
                            required
                            aria-invalid={state.fieldErrors?.display_name ? true : undefined}
                        />
                        <FieldError message={state.fieldErrors?.display_name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="aw-email">Email</Label>
                        <Input
                            id="aw-email"
                            name="email"
                            type="email"
                            placeholder="worker@example.com"
                            autoComplete="off"
                            required
                            aria-invalid={state.fieldErrors?.email ? true : undefined}
                        />
                        <FieldError message={state.fieldErrors?.email} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="aw-password">Password</Label>
                        <Input
                            id="aw-password"
                            name="password"
                            type="text"
                            placeholder="At least 8 characters"
                            autoComplete="off"
                            required
                            minLength={8}
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
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center justify-center rounded-md bg-surface px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-border transition hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={pending}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <UserPlus className="h-4 w-4" aria-hidden />
                            {pending ? "Creating…" : "Create worker"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
