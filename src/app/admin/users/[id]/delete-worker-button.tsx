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
import { deleteWorkerAction } from "@/app/admin/actions";

type Props = {
    ownerId: string;
    workerId: string;
    displayName: string;
};

export function DeleteWorkerButton({ ownerId, workerId, displayName }: Props) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    function onConfirm(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await deleteWorkerAction(ownerId, workerId);
            } catch (err) {
                if (isRedirectError(err)) throw err;
                toast.error(
                    err instanceof Error ? err.message : "Could not delete worker.",
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
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-destructive transition hover:opacity-70"
                >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this worker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{displayName}</span> will be
                        permanently removed and will no longer be able to sign in. This action
                        cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={pending}
                        className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {pending ? "Deleting…" : "Delete worker"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
