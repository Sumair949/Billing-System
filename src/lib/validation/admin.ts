import { z } from "zod";

const optionalText = (max: number) =>
    z
        .union([z.string(), z.null(), z.undefined()])
        .transform((v) => {
            if (v == null) return undefined;
            const s = v.trim();
            return s === "" ? undefined : s;
        })
        .pipe(z.string().max(max).optional());

const optionalEmail = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
        if (v == null) return undefined;
        const s = v.trim();
        if (s === "") return undefined;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Enter a valid email address.",
            });
            return z.NEVER;
        }
        return s;
    });

const shopFields = {
    shop_name: z
        .string()
        .trim()
        .min(1, "Shop name is required")
        .max(100, "Shop name is too long"),
    shop_address: optionalText(500),
    shop_phone: optionalText(50),
    shop_email: optionalEmail,
    shop_ntn: optionalText(50),
    shop_stn: optionalText(50),
};

export const createUserSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password is too long"),
    ...shopFields,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateShopInfoSchema = z.object(shopFields);

export type UpdateShopInfoInput = z.infer<typeof updateShopInfoSchema>;
