import { z } from "zod";

export const createUserSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password is too long"),
    shop_name: z
        .string()
        .trim()
        .min(1, "Shop name is required")
        .max(100, "Shop name is too long"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
