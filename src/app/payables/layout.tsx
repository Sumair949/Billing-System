import { AppShell } from "@/components/app-shell";

export default function PayablesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppShell>{children}</AppShell>;
}
