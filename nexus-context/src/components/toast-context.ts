import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}
