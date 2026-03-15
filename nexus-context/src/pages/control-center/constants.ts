export const STATUS_LABELS = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
} as const;

export const SOURCE_STYLES: Record<string, string> = {
    web: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    mcp: "border-violet-500/25 bg-violet-500/10 text-violet-200",
    system: "border-zinc-700 bg-zinc-900 text-zinc-300",
};
