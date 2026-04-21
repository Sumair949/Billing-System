import { z } from "zod";

export const changePasswordSchema = z
    .object({
        current_password: z.string().min(1, "Enter your current password"),
        new_password: z
            .string()
            .min(8, "New password must be at least 8 characters")
            .max(128, "Password is too long"),
        confirm_password: z.string().min(1, "Confirm your new password"),
    })
    .refine((d) => d.new_password === d.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    })
    .refine((d) => d.new_password !== d.current_password, {
        message: "New password must be different from current",
        path: ["new_password"],
    });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
