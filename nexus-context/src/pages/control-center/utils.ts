export function formatRelativeTime(value?: string | null) {
    if (!value) return "No timestamp";
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

export function formatTimestamp(value?: string | null) {
    if (!value) return "No timestamp";
    return new Date(value).toLocaleString();
}

export function splitLabels(value?: string | null) {
    if (!value) return [];
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function priorityClass(priority: string) {
    switch (priority) {
        case "critical":
            return "border-rose-500/30 bg-rose-500/10 text-rose-200";
        case "high":
            return "border-amber-500/30 bg-amber-500/10 text-amber-200";
        case "low":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
        default:
            return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    }
}
