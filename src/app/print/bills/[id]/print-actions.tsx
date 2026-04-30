"use client";

import { ChevronLeft, Download, Printer } from "lucide-react";

export function PrintActions({ filename }: { filename?: string }) {
    function handleDone() {
        window.close();
        window.setTimeout(() => {
            window.location.href = "/";
        }, 50);
    }

    function handleDownload() {
        const prev = document.title;
        if (filename) document.title = filename;
        window.print();
        window.setTimeout(() => {
            document.title = prev;
        }, 500);
    }

    return (
        <div className="mb-6 flex items-center justify-end gap-2 print:hidden">
            <button
                type="button"
                onClick={handleDone}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
            >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Done
            </button>
            <button
                type="button"
                onClick={handleDownload}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white px-5 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
            >
                <Download className="h-4 w-4" aria-hidden />
                Download PDF
            </button>
            <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
                <Printer className="h-4 w-4" aria-hidden />
                Print
            </button>
        </div>
    );
}
