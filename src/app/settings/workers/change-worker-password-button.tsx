"use client";

import { KeyRound } from "lucide-react";
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
import {
    changeWorkerPasswordAction,
    type ChangeWorkerPasswordFormState,
} from "./actions";

const initialState: ChangeWorkerPasswordFormState = {};

type Props = { workerId: string; displayName: string };

export function ChangeWorkerPasswordButton({ workerId, displayName }: Props) {
    const [open, setOpen] = useState(false);

    const boundAction = changeWorkerPasswordAction.bind(null, workerId);
    const [state, formAction, pending] = useActionState(boundAction, initialState);

    useEffect(() => {
        if (state.success) setOpen(false);
    }, [state.success]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:opacity-70"
            >
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                Password
            </button>

            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Set a new password for{" "}
                        <span className="font-medium text-foreground">{displayName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="space-y-4 px-4 pb-6 pt-2 sm:px-6">
                    <div className="space-y-2">
                        <Label htmlFor="cwp-password">New password</Label>
                        <Input
                            id="cwp-password"
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
                            <KeyRound className="h-4 w-4" aria-hidden />
                            {pending ? "Saving…" : "Update password"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
