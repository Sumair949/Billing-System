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
import { setUserDisabledAction } from "./actions";

type Props = {
    userId: string;
    email: string;
    shopName: string;
    disabled: boolean;
};

export function ToggleUserButton({ userId, email, shopName, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    // disabled=true means the user is currently locked out; clicking this
    // button will ENABLE them. Otherwise the click will DISABLE them.
    const willEnable = disabled;

    function onConfirm(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await setUserDisabledAction(userId, !willEnable);
            } catch (err) {
                if (isRedirectError(err)) throw err;
                toast.error(
                    err instanceof Error
                        ? err.message
                        : willEnable
                          ? "Could not enable user."
                          : "Could not disable user.",
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
                        {willEnable ? "Enable this user?" : "Disable this user?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {willEnable ? (
                            <>
                                <span className="font-medium text-foreground">
                                    {shopName || email}
                                </span>{" "}
                                will be able to sign in again. Their bills and
                                data are untouched.
                            </>
                        ) : (
                            <>
                                <span className="font-medium text-foreground">
                                    {shopName || email}
                                </span>{" "}
                                will no longer be able to sign in. Their bills and
                                data stay intact and you can re-enable the account
                                at any time.
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
                                {pending ? "Enabling…" : "Enable user"}
                            </>
                        ) : (
                            <>
                                <Ban className="h-4 w-4" aria-hidden />
                                {pending ? "Disabling…" : "Disable user"}
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
