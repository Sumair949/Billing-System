import { z } from "zod";

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
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: enter a valid number (up to ${maxDecimals} decimal places).` });
            return z.NEVER;
        }
        const num = Number(str);
        if (!Number.isFinite(num) || num < min) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: allowZero ? `${label} must be zero or greater.` : `${label} must be greater than zero.` });
            return z.NEVER;
        }
        if (!allowZero && num === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be greater than zero.` });
            return z.NEVER;
        }
        if (num > max) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is too large.` });
            return z.NEVER;
        }
        return str;
    });
}

function optionalDecimalSchema(opts: {
    max?: number;
    maxDecimals?: number;
    label: string;
}) {
    const { max = 999_999_999_999.99, maxDecimals = 2, label } = opts;
    const re = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
    return z
        .union([z.string(), z.number(), z.null(), z.undefined()])
        .transform((value, ctx) => {
            if (value === null || value === undefined) return undefined;
            const str = typeof value === "number" ? String(value) : value.trim();
            if (str === "") return undefined;
            if (!re.test(str)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: enter a valid number (up to ${maxDecimals} decimal places).` });
                return z.NEVER;
            }
            const num = Number(str);
            if (!Number.isFinite(num) || num < 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be zero or greater.` });
                return z.NEVER;
            }
            if (num > max) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is too large.` });
                return z.NEVER;
            }
            return str;
        });
}

// Optional decimal that returns "0" instead of undefined when blank.
function chargeSchema(label: string) {
    const re = /^\d+(\.\d{1,2})?$/;
    return z
        .union([z.string(), z.number(), z.null(), z.undefined()])
        .transform((value, ctx) => {
            if (value === null || value === undefined) return "0";
            const str = typeof value === "number" ? String(value) : value.trim();
            if (str === "") return "0";
            if (!re.test(str)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label}: enter a valid number.` });
                return z.NEVER;
            }
            const num = Number(str);
            if (!Number.isFinite(num) || num < 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be zero or greater.` });
                return z.NEVER;
            }
            if (num > 9_999_999) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is too large.` });
                return z.NEVER;
            }
            return str;
        });
}

function optionalText() {
    return z
        .union([z.string(), z.null(), z.undefined()])
        .transform((v) => {
            if (v == null) return undefined;
            const s = v.trim();
            return s === "" ? undefined : s;
        });
}

export const purchaseItemSchema = z
    .object({
        description: z.string().trim().min(1, "Description is required").max(500, "Description is too long"),
        quantity: optionalDecimalSchema({ maxDecimals: 3, max: 999_999_999, label: "Quantity" }),
        weight: optionalDecimalSchema({ maxDecimals: 3, max: 999_999_999, label: "Weight" }),
        rate: decimalSchema({ maxDecimals: 2, label: "Rate" }),
    })
    .refine(
        (d) => (d.quantity !== undefined) !== (d.weight !== undefined),
        { message: "Each row needs either quantity or weight — not both and not neither." },
    );

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

export const purchaseSchema = z
    .object({
        supplier_name: z.string().trim().min(1, "Supplier name is required").max(200, "Supplier name is too long"),
        purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)"),
        total_amount: decimalSchema({ max: 999_999_999, maxDecimals: 2, label: "Total amount" }),
        paid_amount: decimalSchema({ max: 999_999_999, maxDecimals: 2, label: "Paid amount" }),
        freight_charges: chargeSchema("Freight charges"),
        loading_charges: chargeSchema("Loading charges"),
        discount: chargeSchema("Discount"),
        prepared_by: optionalText(),
        approved_by: optionalText(),
        items: z.array(purchaseItemSchema).min(1, "Add at least one item").max(100, "Too many items"),
    })
    .refine(
        (d) => Number(d.paid_amount) <= Number(d.total_amount) + 0.001,
        { message: "Paid amount cannot exceed the total.", path: ["paid_amount"] },
    );

export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const purchaseSearchSchema = z.object({
    q: z.string().trim().max(100).optional().default(""),
    page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
    status: z.enum(["all", "paid", "partial", "unpaid"]).optional().default("all"),
});

export const PURCHASE_PAGE_SIZE = 20;
