import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Brain, CircleHelp, FileCode2, Flag, StepForward, RefreshCw, Inbox } from "lucide-react";
import { fetchMemoryOverview, fetchTasks, type Task, type TaskMemorySummary } from "../lib/api";
import { TaskContextModal } from "../components/TaskContextModal";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { useParams } from "react-router-dom";

const STATUS_LABEL: Record<Task["status"], string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
};

export function MemoryHub() {
    const { projectId } = useParams();
    const [memories, setMemories] = useState<TaskMemorySummary[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMemory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [memoryData, taskData] = await Promise.all([fetchMemoryOverview(projectId), fetchTasks(projectId)]);
            setMemories(memoryData);
            setTasks(taskData);
        } catch (err) {
            console.error(err);
            setError("Failed to load memory overview. Is the backend running?");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadMemory();
    }, [loadMemory]);

    return (
        <div className="h-full overflow-auto p-6 nexus-scroll">
            <div className="mb-6">
                <div className="mb-1.5 inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300">
                    <Brain size={14} /> Memory Hub
                </div>
                <h1 className="text-2xl font-bold text-white">Agent Working Memory</h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-400">
                    Every card answers: what changed, what matters, what is blocked, and what should happen next.
                </p>
            </div>

            {loading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 animate-pulse">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 w-2/3 skeleton-shimmer rounded" />
                                    <div className="h-3 w-20 skeleton-shimmer rounded" />
                                </div>
                                <div className="h-5 w-16 skeleton-shimmer rounded" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-3 w-24 skeleton-shimmer rounded" />
                                <div className="h-4 w-full skeleton-shimmer rounded" />
                                <div className="h-3 w-20 skeleton-shimmer rounded" />
                                <div className="h-4 w-5/6 skeleton-shimmer rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10">
                        <RefreshCw size={24} className="text-rose-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Connection Error</h3>
                    <p className="text-sm text-zinc-400 mb-6 max-w-sm">{error}</p>
                    <button
                        onClick={() => void loadMemory()}
                        className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                    >
                        <RefreshCw size={14} /> Try Again
                    </button>
                </div>
            ) : memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/50">
                        <Inbox size={24} className="text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Memories Yet</h3>
                    <p className="text-sm text-zinc-400 max-w-sm">
                        Agent memories will appear here once tasks have been processed through the MCP server.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {memories.map((memory, i) => {
                        const task = tasks.find((item) => item.id === memory.task_id) ?? null;
                        return (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                key={memory.task_id}
                                type="button"
                                onClick={() => setSelectedTask(task)}
                                className="border border-white/5 bg-zinc-900/40 backdrop-blur-md shadow-lg p-5 text-left transition hover:border-white/10 hover:bg-zinc-900/60 hover:-translate-y-0.5"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-lg font-semibold text-white">{memory.task_title}</div>
                                        <div className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                            {STATUS_LABEL[memory.task_status]}
                                        </div>
                                    </div>
                                    <span className="border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                                        {memory.recent_entries.length} entries
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <Section icon={<Brain size={14} />} title="Latest Summary" text={memory.latest_summary || "No summary yet."} />
                                    <Section icon={<StepForward size={14} />} title="Next Step" text={memory.latest_next_step || "No next step yet."} />
                                    <ChipRow icon={<FileCode2 size={14} />} title="Files" items={memory.recent_files} empty="No files tracked." />
                                    <ChipRow icon={<Flag size={14} />} title="Decisions" items={memory.active_decisions} empty="No decisions recorded." />
                                    <ChipRow icon={<CircleHelp size={14} />} title="Open Questions" items={memory.open_questions} empty="No open questions recorded." />
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            )}

            <TaskContextModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </div>
    );
}

interface SectionProps {
    icon: React.ReactNode;
    title: string;
    text: string;
}

function Section({ icon, title, text }: SectionProps) {
    return (
        <div>
            <div className="mb-0.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {icon} {title}
            </div>
            {text === "No summary yet." || text === "No next step yet." ? (
                <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
            ) : (
                <MarkdownRenderer content={text} />
            )}
        </div>
    );
}

interface ChipRowProps {
    icon: React.ReactNode;
    title: string;
    items: string[];
    empty: string;
}

function ChipRow({ icon, title, items, empty }: ChipRowProps) {
    return (
        <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {icon} {title}
            </div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                        <span key={item} className="border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300">
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
