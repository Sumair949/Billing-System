"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export const AlertDialogOverlay = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className = "", ...props }, ref) {
    return (
        <AlertDialogPrimitive.Overlay
            ref={ref}
            className={[
                "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]",
                className,
            ].join(" ")}
            {...props}
        />
    );
});

export const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className = "", ...props }, ref) {
    return (
        <AlertDialogPortal>
            <AlertDialogOverlay />
            <AlertDialogPrimitive.Content
                ref={ref}
                className={[
                    "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
                    "rounded-xl bg-surface p-6 shadow-2xl ring-1 ring-border",
                    className,
                ].join(" ")}
                {...props}
            />
        </AlertDialogPortal>
    );
});

export function AlertDialogHeader({
    className = "",
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={["space-y-2", className].join(" ")} {...props} />;
}

export function AlertDialogFooter({
    className = "",
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={["mt-6 flex justify-end gap-2", className].join(" ")}
            {...props}
        />
    );
}

export const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className = "", ...props }, ref) {
    return (
        <AlertDialogPrimitive.Title
            ref={ref}
            className={["text-lg font-semibold text-foreground", className].join(" ")}
            {...props}
        />
    );
});

export const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className = "", ...props }, ref) {
    return (
        <AlertDialogPrimitive.Description
            ref={ref}
            className={["text-sm text-muted-foreground", className].join(" ")}
            {...props}
        />
    );
});

export const AlertDialogAction = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Action>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(function AlertDialogAction({ className = "", ...props }, ref) {
    return (
        <AlertDialogPrimitive.Action
            ref={ref}
            className={[
                "inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60",
                className,
            ].join(" ")}
            {...props}
        />
    );
});

export const AlertDialogCancel = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(function AlertDialogCancel({ className = "", ...props }, ref) {
    return (
        <AlertDialogPrimitive.Cancel
            ref={ref}
            className={[
                "inline-flex items-center justify-center rounded-md bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted",
                className,
            ].join(" ")}
            {...props}
        />
    );
});
