import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdmin();
    return <AppShell>{children}</AppShell>;
}
