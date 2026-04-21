"use client";

import { Trash2 } from "lucide-react";
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
import { deleteUserAction } from "./actions";

type Props = {
    userId: string;
    email: string;
    billCount: number;
};

export function DeleteUserButton({ userId, email, billCount }: Props) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    function onConfirm(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await deleteUserAction(userId);
            } catch (err) {
                if (isRedirectError(err)) throw err;
                toast.error(
                    err instanceof Error ? err.message : "Could not delete user.",
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
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive transition hover:opacity-70"
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{email}</span> and
                        all{" "}
                        <span className="font-medium text-foreground">
                            {billCount.toLocaleString()}
                        </span>{" "}
                        bill{billCount === 1 ? "" : "s"} belonging to them will be
                        permanently removed. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={pending}
                        className="inline-flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {pending ? "Deleting…" : "Delete user"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
