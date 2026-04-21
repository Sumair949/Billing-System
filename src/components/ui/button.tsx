import * as React from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";

const variantClasses: Record<Variant, string> = {
    primary:
        "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50",
    secondary:
        "bg-muted text-foreground border border-border hover:bg-muted/70 disabled:opacity-50",
    destructive:
        "bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/50",
    ghost: "bg-transparent text-foreground hover:bg-muted disabled:opacity-50",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "primary", className = "", ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            {...props}
            className={[
                "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed",
                variantClasses[variant],
                className,
            ].join(" ")}
        />
    );
});
