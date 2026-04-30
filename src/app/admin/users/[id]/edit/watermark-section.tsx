"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import type { WatermarkActionState } from "../admin-actions";

type Props = {
    currentUrl: string | null;
    uploadAction: (formData: FormData) => Promise<WatermarkActionState>;
    removeAction: () => Promise<WatermarkActionState>;
};

export function WatermarkSection({ currentUrl, uploadAction, removeAction }: Props) {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploadPending, startUpload] = useTransition();
    const [removePending, startRemove] = useTransition();

    function handleUpload(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startUpload(async () => {
            const result = await uploadAction(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Watermark updated.");
                if (fileRef.current) fileRef.current.value = "";
                router.refresh();
            }
        });
    }

    function handleRemove() {
        startRemove(async () => {
            const result = await removeAction();
            if (result.error) toast.error(result.error);
            else {
                toast.success("Watermark removed.");
                router.refresh();
            }
        });
    }

    return (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border">
            <div>
                <h2 className="text-base font-semibold text-foreground">Shop watermark</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    PNG, JPG, WebP, or SVG — shown faintly behind all printed documents.
                    Max 2 MB.
                </p>
            </div>

            {currentUrl ? (
                <div className="flex items-start gap-4">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                        <img
                            src={currentUrl}
                            alt="Current watermark"
                            className="h-full w-full object-contain p-1"
                        />
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                        <p className="text-xs text-muted-foreground">Current watermark</p>
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={removePending}
                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-destructive ring-1 ring-destructive/30 transition hover:bg-destructive/10 disabled:opacity-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            {removePending ? "Removing…" : "Remove watermark"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex h-20 w-24 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
            )}

            <form onSubmit={handleUpload} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                    <label
                        htmlFor="watermark-file"
                        className="text-xs font-medium text-muted-foreground"
                    >
                        {currentUrl ? "Replace watermark" : "Upload watermark"}
                    </label>
                    <input
                        ref={fileRef}
                        id="watermark-file"
                        name="watermark"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        required
                        className="block w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                    />
                </div>
                <button
                    type="submit"
                    disabled={uploadPending}
                    className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Upload className="h-4 w-4" aria-hidden />
                    {uploadPending ? "Uploading…" : "Upload"}
                </button>
            </form>
        </div>
    );
}
