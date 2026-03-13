import { useEffect, useRef, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = true,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelBtnRef = useRef<HTMLButtonElement>(null);

    // Focus trap + Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel();
                return;
            }

            if (e.key === "Tab" && dialogRef.current) {
                const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last?.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first?.focus();
                    }
                }
            }
        },
        [onCancel]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", handleKeyDown);
            cancelBtnRef.current?.focus();
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
                aria-hidden="true"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    ref={dialogRef}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    aria-describedby="confirm-dialog-message"
                    className="w-full max-w-sm border border-zinc-800 bg-zinc-950 shadow-2xl animate-fade-up"
                >
                    <div className="p-6">
                        <div className="mb-4 flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${destructive ? "border-rose-500/25 bg-rose-500/10" : "border-sky-500/25 bg-sky-500/10"}`}>
                                <AlertTriangle size={20} className={destructive ? "text-rose-400" : "text-sky-400"} />
                            </div>
                            <h3 id="confirm-dialog-title" className="text-base font-semibold text-white">
                                {title}
                            </h3>
                        </div>
                        <p id="confirm-dialog-message" className="text-sm leading-relaxed text-zinc-400">
                            {message}
                        </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-6 py-4">
                        <button
                            ref={cancelBtnRef}
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`px-4 py-2 text-sm font-semibold transition ${destructive
                                    ? "bg-rose-600 text-white hover:bg-rose-500"
                                    : "bg-sky-600 text-white hover:bg-sky-500"
                                }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
