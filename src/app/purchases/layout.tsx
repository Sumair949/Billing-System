import { AppShell } from "@/components/app-shell";

export default function PurchasesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppShell>{children}</AppShell>;
}
