import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createPurchaseAction } from "../actions";
import { PurchaseForm } from "../purchase-form";

export default function NewPurchasePage() {
    return (
        <section className="mx-auto w-full max-w-5xl space-y-8">
            <div>
                <Link
                    href="/purchases"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Back to purchases
                </Link>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    New purchase
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Fill in the supplier, line items, and payment details. PO
                    number is assigned automatically on save.
                </p>
            </div>

            <PurchaseForm action={createPurchaseAction} submitLabel="Save purchase" />
        </section>
    );
}
