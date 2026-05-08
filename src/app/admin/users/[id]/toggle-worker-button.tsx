"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { isRedirectError } from "@/lib/errors";
import { setWorkerDisabledAction } from "@/app/admin/actions";

type Props = {
    ownerId: string;
    workerId: string;
    displayName: string;
    disabled: boolean;
};

export function ToggleWorkerButton({ ownerId, workerId, displayName, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const willEnable = disabled;

    function onConfirm(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await setWorkerDisabledAction(ownerId, workerId, !willEnable);
            } catch (err) {
                if (isRedirectError(err)) throw err;
                toast.error(
                    err instanceof Error
                        ? err.message
                        : willEnable
                          ? "Could not enable worker."
                          : "Could not disable worker.",
                );
                setOpen(false);
            }
        });
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <button
                    type="button"
                    className={[
                        "inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium transition hover:opacity-70",
                        willEnable ? "text-emerald-700" : "text-amber-700",
                    ].join(" ")}
                >
                    {willEnable ? (
                        <>
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            Enable
                        </>
                    ) : (
                        <>
                            <Ban className="h-3.5 w-3.5" aria-hidden />
                            Disable
                        </>
                    )}
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {willEnable ? "Enable this worker?" : "Disable this worker?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {willEnable ? (
                            <>
                                <span className="font-medium text-foreground">{displayName}</span>{" "}
                                will be able to sign in and create bills again.
                            </>
                        ) : (
                            <>
                                <span className="font-medium text-foreground">{displayName}</span>{" "}
                                will no longer be able to sign in. You can re-enable them at any
                                time.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={pending}
                        className="inline-flex items-center gap-2"
                    >
                        {willEnable ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" aria-hidden />
                                {pending ? "Enabling…" : "Enable worker"}
                            </>
                        ) : (
                            <>
                                <Ban className="h-4 w-4" aria-hidden />
                                {pending ? "Disabling…" : "Disable worker"}
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
