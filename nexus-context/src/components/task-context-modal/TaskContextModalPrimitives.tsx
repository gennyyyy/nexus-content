import type { ReactNode } from "react";

export function Field({
    label,
    placeholder,
    value,
    onChange,
    multiline = false,
    required = false,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    required?: boolean;
}) {
    const className = "w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-600";
    return (
        <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {label} {required ? <span className="text-rose-400">*</span> : null}
            </div>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`${className} min-h-[5rem] resize-y`}
                />
            ) : (
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={className}
                />
            )}
        </label>
    );
}

export function StatusPill({ label, tone }: { label: string; tone: "good" | "warn" | "danger" | "neutral" }) {
    const toneClass = {
        good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        danger: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
    }[tone];

    return (
        <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
            {label}
        </span>
    );
}

export function MemoryList({ title, icon, items, empty }: { title: string; icon: ReactNode; items: string[]; empty: string }) {
    return (
        <div className="border border-zinc-800/80 bg-black/20 p-2.5">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {icon} {title}
            </div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                        <span key={item} className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-zinc-500">{empty}</p>
            )}
        </div>
    );
}
