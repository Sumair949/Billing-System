import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { changePasswordAction } from "../actions";
import { ChangePasswordForm } from "./form";

export default function ChangePasswordPage() {
    return (
        <section className="space-y-6">
            <div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to dashboard
                </Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Change password
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Use a strong password you don&apos;t use anywhere else.
                </p>
            </div>

            <div className="max-w-xl">
                <ChangePasswordForm action={changePasswordAction} />
            </div>
        </section>
    );
}
