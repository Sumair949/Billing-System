"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { isRedirectError } from "@/lib/errors";
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
import { deletePurchaseAction } from "./actions";

export function DeletePurchaseButton({
    id,
    purchaseNo,
}: {
    id: string;
    purchaseNo: string;
}) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    function onConfirm(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await deletePurchaseAction(id);
            } catch (err) {
                if (isRedirectError(err)) throw err;
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Could not delete the purchase.",
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
                    <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Purchase{" "}
                        <span className="font-mono font-medium text-foreground">
                            {purchaseNo}
                        </span>{" "}
                        will be permanently removed. This action cannot be
                        undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={pending}
                        className="inline-flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {pending ? "Deleting…" : "Delete purchase"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
