"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UpdateShopFormState } from "../../../actions";

const initialState: UpdateShopFormState = {};

type Props = {
    action: (
        state: UpdateShopFormState,
        formData: FormData,
    ) => Promise<UpdateShopFormState>;
    cancelHref: string;
    defaultValues: {
        shop_name: string;
        shop_address: string;
        shop_phone: string;
        shop_email: string;
        shop_ntn: string;
        shop_stn: string;
    };
};

export function ShopInfoForm({ action, cancelHref, defaultValues }: Props) {
    const [state, formAction, pending] = useActionState(action, initialState);

    return (
        <form
            action={formAction}
            className="space-y-5 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border"
            noValidate
        >
            <div className="space-y-2">
                <Label htmlFor="shop_name">Shop name</Label>
                <Input
                    id="shop_name"
                    name="shop_name"
                    type="text"
                    required
                    maxLength={100}
                    defaultValue={defaultValues.shop_name}
                    placeholder="Ahmed Steel Traders"
                    aria-invalid={state.fieldErrors?.shop_name ? true : undefined}
                />
                <FieldError message={state.fieldErrors?.shop_name} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="shop_address">Address</Label>
                <Input
                    id="shop_address"
                    name="shop_address"
                    type="text"
                    maxLength={500}
                    defaultValue={defaultValues.shop_address}
                    placeholder="Street, city"
                    aria-invalid={state.fieldErrors?.shop_address ? true : undefined}
                />
                <FieldError message={state.fieldErrors?.shop_address} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="shop_phone">Phone</Label>
                <Input
                    id="shop_phone"
                    name="shop_phone"
                    type="tel"
                    maxLength={50}
                    defaultValue={defaultValues.shop_phone}
                    placeholder="0300-1234567"
                    aria-invalid={state.fieldErrors?.shop_phone ? true : undefined}
                />
                <FieldError message={state.fieldErrors?.shop_phone} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="shop_email">Email</Label>
                <Input
                    id="shop_email"
                    name="shop_email"
                    type="email"
                    maxLength={200}
                    defaultValue={defaultValues.shop_email}
                    placeholder="shop@example.com"
                    aria-invalid={state.fieldErrors?.shop_email ? true : undefined}
                />
                <FieldError message={state.fieldErrors?.shop_email} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="shop_ntn">NTN</Label>
                    <Input
                        id="shop_ntn"
                        name="shop_ntn"
                        type="text"
                        maxLength={50}
                        defaultValue={defaultValues.shop_ntn}
                        placeholder="1234567-8"
                        aria-invalid={state.fieldErrors?.shop_ntn ? true : undefined}
                    />
                    <FieldError message={state.fieldErrors?.shop_ntn} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="shop_stn">STN</Label>
                    <Input
                        id="shop_stn"
                        name="shop_stn"
                        type="text"
                        maxLength={50}
                        defaultValue={defaultValues.shop_stn}
                        placeholder="12-34-5678-001-56"
                        aria-invalid={state.fieldErrors?.shop_stn ? true : undefined}
                    />
                    <FieldError message={state.fieldErrors?.shop_stn} />
                </div>
            </div>

            {state.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {state.error}
                </p>
            ) : null}

            {state.success ? (
                <p
                    role="status"
                    className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200"
                >
                    Shop info updated.
                </p>
            ) : null}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {pending ? "Saving…" : "Save changes"}
                </button>
                <Link
                    href={cancelHref}
                    className="inline-flex items-center justify-center rounded-md bg-surface px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-border hover:bg-muted"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
