"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
                className={`fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-surface shadow-2xl ring-1 ring-border focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-h-[90vh] ${className}`}
            >
                {children}
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 opacity-60 transition hover:bg-muted hover:opacity-100 focus:outline-none">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="border-b border-border px-4 py-4 pr-12 sm:px-6 sm:py-5">
            {children}
        </div>
    );
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
    return (
        <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
            {children}
        </DialogPrimitive.Title>
    );
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
    return (
        <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
            {children}
        </DialogPrimitive.Description>
    );
}
