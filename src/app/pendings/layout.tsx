import { AppShell } from "@/components/app-shell";

export default function PendingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppShell>{children}</AppShell>;
}
