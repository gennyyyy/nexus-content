import { useEffect, useState } from "react";
import { fetchTaskActivity, type ActivityEvent } from "../lib/api";
import { Clock } from "lucide-react";

export function TaskHistoryPanel({ taskId }: { taskId: number }) {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetchTaskActivity(taskId)
            .then((data) => {
                if (mounted) setEvents(data);
            })
            .catch(console.error)
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [taskId]);

    if (loading) {
        return <div className="p-6 text-center text-zinc-500 text-xs font-medium animate-pulse">Loading history timeline...</div>;
    }

    if (events.length === 0) {
        return (
            <div className="p-6 text-center">
                <p className="text-zinc-500 text-xs">No history recorded yet.</p>
                <p className="text-[10px] text-zinc-600 mt-1">Status changes and updates will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-0 mt-2 p-1">
            {events.map((event, index) => (
                <div key={event.id} className={`relative pl-5 pb-5 ${index === events.length - 1 ? "" : "border-l border-sky-900/40"}`}>
                    <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500/20 ring-1 ring-sky-500/50">
                        <div className="absolute inset-[2px] rounded-full bg-sky-400" />
                    </div>
                    <div className="text-sm font-semibold text-zinc-200">{event.title}</div>
                    <div className="mt-1 text-xs leading-5 text-zinc-400">{event.summary}</div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded bg-zinc-900/60 px-2 py-1 border border-white/5 text-[10px] font-medium text-zinc-500">
                        <Clock size={10} className="text-zinc-400" />
                        {new Date(event.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                        <span className="ml-1 w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="capitalize">{event.actor}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
