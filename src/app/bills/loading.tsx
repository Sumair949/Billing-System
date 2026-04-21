export default function Loading() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-64 w-full animate-pulse rounded bg-muted" />
        </div>
    );
}
