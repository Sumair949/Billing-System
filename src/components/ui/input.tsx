import * as React from "react";

type Variant = "default" | "dark";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    variant?: Variant;
};

const base =
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses: Record<Variant, string> = {
    default:
        "border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-ring",
    dark: "border-auth-input-border bg-auth-input text-auth-input-foreground placeholder:text-auth-muted focus-visible:ring-white/40",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
    { className = "", variant = "default", ...props },
    ref,
) {
    return (
        <input
            ref={ref}
            {...props}
            className={[base, variantClasses[variant], className].join(" ")}
        />
    );
});
