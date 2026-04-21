import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center px-4">
            <div className="max-w-sm space-y-4 text-center">
                <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
                <p className="text-sm text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Back to dashboard
                </Link>
            </div>
        </main>
    );
}
