"use client";

import { ChevronLeft, Download, Printer } from "lucide-react";

export function PrintActions({
    filename,
    format = "a5",
}: {
    filename?: string;
    format?: "a5" | "a4";
}) {
    function handleDone() {
        window.close();
        window.setTimeout(() => {
            window.location.href = "/purchases";
        }, 50);
    }

    async function handleDownload() {
        const card = document.getElementById("print-card");
        if (!card) return;

        const originalMinHeight = card.style.minHeight;
        const widthPx = card.offsetWidth;
        const ratio = format === "a5" ? 210 / 148 : 297 / 210;
        card.style.minHeight = `${widthPx * ratio}px`;

        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import("html2canvas-pro"),
                import("jspdf"),
            ]);

            const canvas = await html2canvas(card, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const pdf = new jsPDF({ unit: "mm", format, orientation: "portrait" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = (canvas.height * pageWidth) / canvas.width;

            if (imgHeight <= pageHeight + 1) {
                pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, Math.min(imgHeight, pageHeight));
            } else {
                let heightLeft = imgHeight;
                let position = 0;
                pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
                heightLeft -= pageHeight;
                while (heightLeft > 1) {
                    position -= pageHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
            }

            pdf.save(filename ? `${filename}.pdf` : "document.pdf");
        } finally {
            card.style.minHeight = originalMinHeight;
        }
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
