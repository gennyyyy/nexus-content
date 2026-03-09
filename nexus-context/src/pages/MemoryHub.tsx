import { useEffect, useState } from "react";
import { Brain, CircleHelp, FileCode2, Flag, StepForward } from "lucide-react";
import { fetchMemoryOverview, fetchTasks, type Task, type TaskMemorySummary } from "../lib/api";
import { TaskContextModal } from "../components/TaskContextModal";

const STATUS_LABEL: Record<Task["status"], string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
};

export function MemoryHub() {
    const [memories, setMemories] = useState<TaskMemorySummary[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadMemory();
    }, []);

    async function loadMemory() {
        setLoading(true);
        try {
            const [memoryData, taskData] = await Promise.all([fetchMemoryOverview(), fetchTasks()]);
            setMemories(memoryData);
            setTasks(taskData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-full overflow-auto p-8">
            <div className="mb-8">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300">
                    <Brain size={14} /> Memory Hub
                </div>
                <h1 className="text-3xl font-bold text-white">Agent Working Memory</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
                    This page is the handoff surface for agents. Every card should answer: what changed, what matters, what is blocked, and what should happen next.
                </p>
            </div>

            {loading ? (
                <div className="text-zinc-500">Loading memory overview...</div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {memories.map((memory) => {
                        const task = tasks.find((item) => item.id === memory.task_id) ?? null;
                        return (
                            <button
                                key={memory.task_id}
                                type="button"
                                onClick={() => setSelectedTask(task)}
                                className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xl font-semibold text-white">{memory.task_title}</div>
                                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                            {STATUS_LABEL[memory.task_status]}
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                                        {memory.recent_entries.length} entries
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <Section icon={<Brain size={14} />} title="Latest Summary" text={memory.latest_summary || "No summary yet."} />
                                    <Section icon={<StepForward size={14} />} title="Next Step" text={memory.latest_next_step || "No next step yet."} />
                                    <ChipRow icon={<FileCode2 size={14} />} title="Files" items={memory.recent_files} empty="No files tracked." />
                                    <ChipRow icon={<Flag size={14} />} title="Decisions" items={memory.active_decisions} empty="No decisions recorded." />
                                    <ChipRow icon={<CircleHelp size={14} />} title="Open Questions" items={memory.open_questions} empty="No open questions recorded." />
                                </div>
                            </button>
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
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {icon} {title}
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
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
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {icon} {title}
            </div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span key={item} className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300">
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
