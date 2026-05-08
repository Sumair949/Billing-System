import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Printer } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/(auth)/actions";
import { BillForm } from "@/app/bills/bill-form";
import { createWorkerBillAction } from "./actions";

export default async function WorkerNewBillPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string }>;
}) {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const ownerId = user.user_metadata?.owner_id as string | undefined;
    const displayName = (user.user_metadata?.display_name as string | undefined) ?? "Worker";

    if (!ownerId) redirect("/login");

    // Fetch owner's shop name for header display
    const admin = createSupabaseAdminClient();
    const { data: ownerData } = await admin.auth.admin.getUserById(ownerId);
    const shopName =
        (ownerData?.user?.user_metadata?.shop_name as string | undefined)?.trim() || "Steel Shop";

    const { saved } = await searchParams;

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="bg-header text-header-foreground shadow-sm">
                <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-20 sm:px-6">
                    <div />
                    <div className="min-w-0 text-center">
                        <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
                            {shopName}
                        </h1>
                        <p className="truncate text-xs text-header-foreground/70">{displayName}</p>
                    </div>
                    <div className="flex justify-end">
                        <form action={logoutAction}>
                            <button
                                type="submit"
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-header-foreground/80 ring-1 ring-header-foreground/20 transition hover:bg-header-foreground/10 hover:text-header-foreground"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 py-8 sm:px-6">
                {saved ? (
                    <div className="mx-auto max-w-2xl">
                        <div className="flex flex-col items-center gap-6 rounded-xl bg-surface px-6 py-12 text-center shadow-sm ring-1 ring-border">
                            <CheckCircle className="h-14 w-14 text-green-600" aria-hidden />
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Bill saved!</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    The bill has been recorded successfully.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3">
                                <Link
                                    href={`/print/bills/${saved}`}
                                    className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90"
                                >
                                    <Printer className="h-4 w-4" aria-hidden />
                                    Print / Download
                                </Link>
                                <Link
                                    href="/worker/new-bill"
                                    className="inline-flex items-center gap-2 rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-muted"
                                >
                                    New Bill
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto max-w-3xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-foreground">New Bill</h2>
                        </div>
                        <BillForm
                            action={createWorkerBillAction}
                            submitLabel="Save bill"
                            defaultValues={{ prepared_by: displayName }}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
