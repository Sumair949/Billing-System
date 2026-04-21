import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createBillAction } from "../actions";
import { BillForm } from "../bill-form";

export default function NewBillPage() {
    return (
        <section className="mx-auto w-full max-w-5xl space-y-8">
            <div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to dashboard
                </Link>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    New bill
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Fill in the customer, line items, and payment details. Bill
                    number is assigned automatically on save.
                </p>
            </div>

            <BillForm action={createBillAction} submitLabel="Save bill" />
        </section>
    );
}
