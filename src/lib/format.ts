export const CURRENCY_SYMBOL = "Rs";

const amountFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Date-only + UTC so server and client render identical strings. The values
// we pass are either DATE columns (e.g. bill_date "2026-04-20") or timestamps
// where we only care about the calendar date — a local-time format would
// shift across the SSR/hydration boundary whenever the user isn't in UTC.
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
});

export function formatAmount(value: string | number): string {
    const num = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(num)) return String(value);
    return `${CURRENCY_SYMBOL} ${amountFormatter.format(num)}`;
}

export function formatAmountPlain(value: string | number): string {
    const num = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(num)) return String(value);
    return amountFormatter.format(num);
}

export function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return dateFormatter.format(d);
}

// Escapes user input so it can be used safely inside a Postgres `ILIKE` pattern
// (prevents wildcard smuggling) and a PostgREST filter value (commas / parens
// separate arguments). The result is ready to be wrapped with `%...%`.
export function escapeIlike(input: string): string {
    return input
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_")
        .replace(/,/g, "\\,")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}
