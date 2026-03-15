import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export function SectionPanel({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("surface-panel rounded-[28px] border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.22)]", className)}>
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

export function StatCard({
    label,
    value,
    detail,
    icon,
    tone,
}: {
    label: string;
    value: number;
    detail: string;
    icon: ReactNode;
    tone: "sky" | "violet" | "rose" | "amber" | "emerald" | "slate";
}) {
    const toneClass = {
        sky: "border-sky-500/20 bg-sky-500/10 text-sky-200",
        violet: "border-violet-500/20 bg-violet-500/10 text-violet-200",
        rose: "border-rose-500/20 bg-rose-500/10 text-rose-200",
        amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
        emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
        slate: "border-zinc-700 bg-zinc-900 text-zinc-200",
    }[tone];

    return (
        <div className="surface-panel rounded-[24px] border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-[0_18px_45px_rgba(2,6,23,0.18)]">
            <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border", toneClass)}>{icon}</div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</div>
            <div className="mt-1 text-sm text-zinc-400">{detail}</div>
        </div>
    );
}

export function MiniMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-zinc-800/70 bg-black/20 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{value}</div>
        </div>
    );
}

export function ServerEndpoint({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-1 rounded-2xl border border-zinc-800/70 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-200">{value}</div>
        </div>
    );
}

export function InfoBlock({
    title,
    icon,
    children,
    className,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {icon} {title}
            </div>
            <div className={cn("text-sm leading-relaxed text-zinc-300", className)}>{children}</div>
        </div>
    );
}

export function Badge({ className, children }: { className: string; children: ReactNode }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", className)}>
            {children}
        </span>
    );
}

export function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-[24px] border border-dashed border-zinc-800/80 bg-zinc-950/50 px-4 py-8 text-center text-sm leading-7 text-zinc-500">
            {message}
        </div>
    );
}

export function LoadingState() {
    return (
        <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div key={index} className="h-40 animate-pulse rounded-[24px] bg-zinc-900/70" />
                    ))}
                </div>
                <div className="h-56 animate-pulse rounded-[28px] bg-zinc-900/70" />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <div className="h-80 animate-pulse rounded-[28px] bg-zinc-900/70" />
                <div className="h-80 animate-pulse rounded-[28px] bg-zinc-900/70" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
                <div className="h-[460px] animate-pulse rounded-[28px] bg-zinc-900/70" />
                <div className="h-[460px] animate-pulse rounded-[28px] bg-zinc-900/70" />
            </div>

            <div className="h-[380px] animate-pulse rounded-[28px] bg-zinc-900/70" />
        </div>
    );
}
