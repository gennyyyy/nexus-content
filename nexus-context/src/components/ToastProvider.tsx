import { useCallback, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { ToastContext, type ToastType } from "./toast-context";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    exiting?: boolean;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = "info") => {
        const id = nextId++;
        setToasts((prev) => [...prev, { id, message, type }]);

        // Start exit animation after 2.7s, then remove at 3s
        setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        }, 2700);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3100);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div
                className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse items-end gap-2"
                aria-live="polite"
                aria-label="Notifications"
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const ICON_MAP: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
    error: <XCircle size={16} className="text-rose-400 shrink-0" />,
    info: <Info size={16} className="text-sky-400 shrink-0" />,
};

const BORDER_MAP: Record<ToastType, string> = {
    success: "border-emerald-500/25",
    error: "border-rose-500/25",
    info: "border-sky-500/25",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    return (
        <div
            role="status"
            className={`flex items-center gap-3 border bg-zinc-950/95 backdrop-blur-lg px-4 py-3 shadow-xl transition-all duration-300 ${BORDER_MAP[toast.type]} ${toast.exiting
                    ? "translate-x-full opacity-0"
                    : "translate-x-0 opacity-100 animate-fade-up"
                }`}
            style={{ minWidth: 280, maxWidth: 420 }}
        >
            {ICON_MAP[toast.type]}
            <span className="text-sm text-zinc-200 flex-1">{toast.message}</span>
            <button
                onClick={onDismiss}
                className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                aria-label="Dismiss notification"
            >
                <X size={14} />
            </button>
        </div>
    );
}
