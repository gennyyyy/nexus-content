import type { ReactNode } from "react";

export function Tag({ className, children }: { className: string; children: ReactNode }) {
    return (
        <span
            className={`inline-flex border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${className}`}
        >
            {children}
        </span>
    );
}

export function EmptyState({ message, className = "" }: { message: string; className?: string }) {
    return (
        <div
            className={`border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm leading-7 text-zinc-500 ${className}`}
        >
            {message}
        </div>
    );
}

export function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="border border-zinc-800/80 bg-zinc-900/60 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">{value}</div>
        </div>
    );
}

export function ModeButton({
    active,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: React.ComponentType<{ size: number }>;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2.5 text-left transition ${active ? "bg-zinc-50 text-zinc-950" : "text-zinc-300 hover:bg-zinc-800/70"}`}
        >
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon size={16} />
                {label}
            </div>
        </button>
    );
}
