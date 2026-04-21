export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-auth-background px-4 py-10">
            <div className="w-full max-w-md">
                <div className="rounded-xl bg-auth-card text-auth-card-foreground shadow-2xl ring-1 ring-black/10">
                    <div className="space-y-6 p-8">{children}</div>
                </div>
            </div>
        </main>
    );
}
