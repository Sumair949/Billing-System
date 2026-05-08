// Sliding-window rate limiter backed by an in-process Map.
// In serverless deployments each function instance has its own Map — the
// effective limit is per-instance. For high traffic swap the store for an
// edge KV (Upstash Redis, etc.).
const WINDOW_MS = 60_000;
const store = new Map<string, { hits: number; resetAt: number }>();

// Returns true when the caller is over limit, false when the request is allowed.
export function checkRateLimit(userId: string, action: string, maxPerMinute: number): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        store.set(key, { hits: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    if (entry.hits >= maxPerMinute) return true;
    entry.hits++;
    return false;
}
