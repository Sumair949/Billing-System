import Image from "next/image";

type Props = {
    className?: string;
    priority?: boolean;
};

// Uses /public/logo.png. The width/height here are hints to prevent layout
// shift; actual render size is controlled by Tailwind classes on the wrapper.
export function Logo({ className = "h-10 w-auto", priority = false }: Props) {
    return (
        <Image
            src="/logo.png"
            alt="Steel Shop Billing"
            width={400}
            height={100}
            priority={priority}
            className={className}
        />
    );
}
