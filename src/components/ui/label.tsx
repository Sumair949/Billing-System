import * as React from "react";

type Variant = "default" | "dark";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
    variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
    default: "text-sm font-medium text-foreground",
    dark: "text-sm font-medium text-auth-card-foreground",
};

export function Label({ className = "", variant = "default", ...props }: LabelProps) {
    return (
        <label
            {...props}
            className={[variantClasses[variant], className].join(" ")}
        />
    );
}
