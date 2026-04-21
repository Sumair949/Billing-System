import { z } from "zod";

// Permissive numeric parser — accepts strings or numbers, returns a decimal
// string so we keep full precision going into Postgres `numeric` columns.
function decimalSchema(opts: {
    min?: number;
    max?: number;
    allowZero?: boolean;
    maxDecimals?: number;
    label: string;
}) {
    const { min = 0, max = 999_999_999_999.99, allowZero = true, maxDecimals = 2, label } = opts;
    const re = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
    return z.union([z.string(), z.number()]).transform((value, ctx) => {
        const str = typeof value === "number" ? String(value) : value.trim();
        if (!re.test(str)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${label}: enter a valid number (up to ${maxDecimals} decimal places).`,
            });
            return z.NEVER;
        }
        const num = Number(str);
        if (!Number.isFinite(num) || num < min) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: allowZero
                    ? `${label} must be zero or greater.`
                    : `${label} must be greater than zero.`,
            });
            return z.NEVER;
        }
        if (!allowZero && num === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${label} must be greater than zero.`,
            });
            return z.NEVER;
        }
        if (num > max) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${label} is too large.`,
            });
            return z.NEVER;
        }
        return str;
    });
}

export const billItemSchema = z.object({
    description: z
        .string()
        .trim()
        .min(1, "Description is required")
        .max(500, "Description is too long"),
    quantity: decimalSchema({
        allowZero: false,
        maxDecimals: 3,
        max: 999_999_999,
        label: "Quantity",
    }),
    rate: decimalSchema({ maxDecimals: 2, label: "Rate" }),
});

export type BillItemInput = z.infer<typeof billItemSchema>;

export const billSchema = z
    .object({
        customer_name: z
            .string()
            .trim()
            .min(1, "Customer name is required")
            .max(200, "Customer name is too long"),
        bill_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)"),
        received_amount: decimalSchema({ maxDecimals: 2, label: "Received amount" }),
        items: z
            .array(billItemSchema)
            .min(1, "Add at least one item")
            .max(100, "Too many items"),
    })
    .refine(
        (d) => {
            const total = d.items.reduce(
                (sum, it) => sum + Number(it.quantity) * Number(it.rate),
                0,
            );
            return Number(d.received_amount) <= total + 0.001; // epsilon
        },
        {
            message: "Received amount cannot exceed the total.",
            path: ["received_amount"],
        },
    );

export type BillInput = z.infer<typeof billSchema>;

export const dateRangeEnum = z.enum(["all", "month", "last-month", "last-30"]);
export type DateRange = z.infer<typeof dateRangeEnum>;

export const statusFilterEnum = z.enum(["all", "paid", "partial", "unpaid"]);
export type StatusFilter = z.infer<typeof statusFilterEnum>;

export const searchSchema = z.object({
    q: z.string().trim().max(100, "Search term is too long").optional().default(""),
    page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
    range: dateRangeEnum.optional().default("all"),
    status: statusFilterEnum.optional().default("all"),
});

export const PAGE_SIZE = 20;
