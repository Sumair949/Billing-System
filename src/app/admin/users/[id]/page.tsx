import { Ban, ChevronLeft, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin, isAdminEmail } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminChangePasswordAction, type ChangePasswordFormState } from "./admin-actions";
import { ChangePasswordDialog } from "./change-password-dialog";
import { AdminUserFlashToast } from "./flash-toast";
import { ToggleUserButton } from "@/app/admin/toggle-user-button";
import { DeleteWorkerButton } from "./delete-worker-button";
import { ToggleWorkerButton } from "./toggle-worker-button";

function isBanned(bannedUntil: string | null | undefined): boolean {
    if (!bannedUntil) return false;
    const ts = Date.parse(bannedUntil);
    return Number.isFinite(ts) && ts > Date.now();
}

function readShopName(meta: Record<string, unknown> | undefined): string {
    const v = meta?.shop_name;
    return typeof v === "string" ? v : "";
}

type WorkerRow = {
    id: string;
    worker_user_id: string;
    display_name: string;
    is_active: boolean;
    created_at: string;
};

export default async function AdminShopDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    const [userRes, workersDbRes] = await Promise.all([
        admin.auth.admin.getUserById(id),
        admin
            .from("shop_workers")
            .select("id, worker_user_id, display_name, is_active, created_at")
            .eq("owner_id", id)
            .order("created_at", { ascending: true }),
    ]);

    if (userRes.error || !userRes.data.user) notFound();

    const user = userRes.data.user;
    if (isAdminEmail(user.email)) notFound();

    const shopName = readShopName(user.user_metadata);
    const ownerDisabled = isBanned((user as { banned_until?: string | null }).banned_until);

    const workers = (workersDbRes.data ?? []) as WorkerRow[];

    const workerAuthResults = await Promise.all(
        workers.map((w) => admin.auth.admin.getUserById(w.worker_user_id)),
    );
    const workerAuthMap = new Map(
        workerAuthResults
            .map((r) => r.data?.user)
            .filter((u): u is NonNullable<typeof u> => !!u)
            .map((u) => [u.id, u]),
    );

    async function changeOwnerPw(
        state: ChangePasswordFormState,
        formData: FormData,
    ) {
        "use server";
        return adminChangePasswordAction(id, state, formData);
    }

    return (
        <section className="space-y-8">
            <Suspense>
                <AdminUserFlashToast />
            </Suspense>

            {/* Header */}
            <div>
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to shops
                </Link>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                {shopName || (
                                    <span className="italic text-muted-foreground">
                                        (no shop name)
                                    </span>
                                )}
                            </h1>
                            {ownerDisabled ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                                    <Ban className="h-3.5 w-3.5" />
                                    Disabled
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" aria-hidden />
                            {user.email}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <ChangePasswordDialog action={changeOwnerPw} />
                        <ToggleUserButton
                            userId={user.id}
                            email={user.email ?? ""}
                            shopName={shopName}
                            disabled={ownerDisabled}
                        />
                    </div>
                </div>
            </div>

            {/* Workers */}
            <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                <div className="border-b border-border p-5">
                    <h2 className="text-base font-semibold text-foreground">Workers</h2>
                    <p className="text-xs text-muted-foreground">
                        {workers.length === 0
                            ? "No workers assigned to this shop."
                            : `${workers.length} worker${workers.length === 1 ? "" : "s"}`}
                    </p>
                </div>

                {workers.length === 0 ? (
                    <div className="p-16 text-center text-sm text-muted-foreground">
                        No workers yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold">Display Name</th>
                                    <th className="px-6 py-3.5 font-semibold">Email</th>
                                    <th className="px-6 py-3.5 font-semibold">Status</th>
                                    <th className="px-6 py-3.5 font-semibold">Added</th>
                                    <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {workers.map((w) => {
                                    const authUser = workerAuthMap.get(w.worker_user_id);
                                    const workerDisabled = isBanned(
                                        (authUser as { banned_until?: string | null } | undefined)
                                            ?.banned_until,
                                    );

                                    async function changeWorkerPw(
                                        state: ChangePasswordFormState,
                                        formData: FormData,
                                    ) {
                                        "use server";
                                        return adminChangePasswordAction(
                                            w.worker_user_id,
                                            state,
                                            formData,
                                        );
                                    }

                                    return (
                                        <tr key={w.id} className="hover:bg-muted/40">
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                {w.display_name}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {authUser?.email ?? "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                {workerDisabled ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                                                        <Ban className="h-3 w-3" />
                                                        Disabled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {formatDate(w.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-4">
                                                    <ChangePasswordDialog
                                                        action={changeWorkerPw}
                                                    />
                                                    <ToggleWorkerButton
                                                        ownerId={id}
                                                        workerId={w.worker_user_id}
                                                        displayName={w.display_name}
                                                        disabled={workerDisabled}
                                                    />
                                                    <DeleteWorkerButton
                                                        ownerId={id}
                                                        workerId={w.worker_user_id}
                                                        displayName={w.display_name}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
