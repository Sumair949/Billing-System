import { Ban } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { formatDate } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddWorkerDialog } from "./add-worker-dialog";
import { ChangeWorkerPasswordButton } from "./change-worker-password-button";
import { WorkersFlashToast } from "./flash-toast";
import { ToggleWorkerButton } from "./toggle-worker-button";

function isBanned(bannedUntil: string | null | undefined): boolean {
    if (!bannedUntil) return false;
    const ts = Date.parse(bannedUntil);
    return Number.isFinite(ts) && ts > Date.now();
}

export default async function WorkersPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = createSupabaseAdminClient();

    const workersRes = await admin
        .from("shop_workers")
        .select("id, worker_user_id, display_name, is_active, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

    const workers = workersRes.data ?? [];

    const workerAuthResults = await Promise.all(
        workers.map((w) => admin.auth.admin.getUserById(w.worker_user_id)),
    );
    const authMap = new Map(
        workerAuthResults
            .map((r) => r.data?.user)
            .filter((u): u is NonNullable<typeof u> => !!u)
            .map((u) => [u.id, u]),
    );

    return (
        <>
            <Suspense>
                <WorkersFlashToast />
            </Suspense>

            <section className="space-y-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Workers</h1>
                        <p className="mt-2 text-base text-muted-foreground">
                            Workers can sign in and create bills on behalf of your shop.
                        </p>
                    </div>
                    <AddWorkerDialog />
                </header>

                <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
                    {workers.length === 0 ? (
                        <div className="p-16 text-center">
                            <p className="text-sm text-muted-foreground">
                                No workers yet. Click{" "}
                                <span className="font-semibold text-foreground">Add Worker</span>{" "}
                                to create the first one.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Email</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-6 py-3.5 font-semibold">Added</th>
                                        <th className="px-6 py-3.5 text-right font-semibold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {workers.map((w) => {
                                        const authUser = authMap.get(w.worker_user_id);
                                        const banned = isBanned(
                                            (
                                                authUser as
                                                    | { banned_until?: string | null }
                                                    | undefined
                                            )?.banned_until,
                                        );
                                        return (
                                            <tr key={w.id} className="hover:bg-muted/40">
                                                <td className="px-6 py-4 font-medium text-foreground">
                                                    {w.display_name}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {authUser?.email ?? "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {banned ? (
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
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex items-center gap-4">
                                                        <ChangeWorkerPasswordButton
                                                            workerId={w.worker_user_id}
                                                            displayName={w.display_name}
                                                        />
                                                        <ToggleWorkerButton
                                                            workerId={w.worker_user_id}
                                                            displayName={w.display_name}
                                                            disabled={banned}
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
        </>
    );
}
