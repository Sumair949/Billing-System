"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center px-4">
            <div className="max-w-md space-y-4 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                    We hit an unexpected error. Try again, or reload the page.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Try again
                </button>
            </div>
        </main>
    );
}
