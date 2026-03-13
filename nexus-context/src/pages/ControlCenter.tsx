import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Brain,
    CheckCircle2,
    Clock3,
    FileCode2,
    Flag,
    GitBranch,
    ListChecks,
    RefreshCw,
    Server,
    Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TaskContextModal } from "../components/TaskContextModal";
import { cn } from "../lib/utils";
import type { ActivityEvent, AttentionTaskItem, HandoffPulseItem, ReadyQueueItem, ResumePacket } from "../lib/api";
import { useControlCenter } from "./control-center/useControlCenter";

const STATUS_LABELS = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
} as const;

const SOURCE_STYLES: Record<string, string> = {
    web: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    mcp: "border-violet-500/25 bg-violet-500/10 text-violet-200",
    system: "border-zinc-700 bg-zinc-900 text-zinc-300",
};

function formatRelativeTime(value?: string | null) {
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

function formatTimestamp(value?: string | null) {
    if (!value) return "No timestamp";
    return new Date(value).toLocaleString();
}

function splitLabels(value?: string | null) {
    if (!value) return [];
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function priorityClass(priority: string) {
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

export function ControlCenter() {
    const controlCenter = useControlCenter();
    const snapshot = controlCenter.snapshot;

    return (
        <>
            <div className="h-full overflow-auto p-6 nexus-scroll">
                <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
                    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                                <Activity size={14} /> Control Center
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight text-white">Operations view for agent-ready work</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
                                See what is safe to start, what needs cleaner handoffs, and what changed most recently before pushing deeper into MCP automation.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
                                Last updated{" "}
                                <span className="font-medium text-zinc-200">
                                    {controlCenter.lastUpdated ? formatTimestamp(controlCenter.lastUpdated.toISOString()) : "Waiting for data"}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={controlCenter.refresh}
                                className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-500/15"
                            >
                                <RefreshCw size={16} className={controlCenter.refreshing ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        </div>
                    </header>

                    {controlCenter.error ? (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                            {controlCenter.error}
                        </div>
                    ) : null}

                    {controlCenter.loading && !snapshot ? (
                        <LoadingState />
                    ) : snapshot ? (
                        <>
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <StatCard label="Ready tasks" value={snapshot.ready_count} icon={<Workflow size={18} />} detail="Safe to dispatch now" tone="sky" />
                                    <StatCard label="Active tasks" value={snapshot.in_progress_count} icon={<Activity size={18} />} detail="Currently in progress" tone="violet" />
                                    <StatCard label="Blocked tasks" value={snapshot.blocked_count} icon={<AlertTriangle size={18} />} detail="Waiting on dependencies" tone="rose" />
                                    <StatCard label="Handoff gaps" value={snapshot.handoff_gap_count} icon={<Brain size={18} />} detail="Missing summary or next step" tone="amber" />
                                    <StatCard label="Completed" value={snapshot.done_count} icon={<CheckCircle2 size={18} />} detail="Tasks marked done" tone="emerald" />
                                    <StatCard label="Handoffs (7d)" value={snapshot.handoffs_last_7_days} icon={<Clock3 size={18} />} detail="Structured handoffs recorded" tone="slate" />
                                </div>

                                <SectionPanel
                                    title="MCP server health"
                                    description="The web app and future clients read the same SSE surface."
                                    className="min-h-[220px]"
                                >
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-200">
                                                    <Server size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-white">{snapshot.server.name}</div>
                                                    <div className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">{snapshot.server.transport} transport</div>
                                                </div>
                                            </div>
                                            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                                                {snapshot.server.status}
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-3 text-sm text-zinc-300">
                                            <ServerEndpoint label="SSE URL" value={snapshot.server.sse_url} />
                                            <ServerEndpoint label="Post message URL" value={snapshot.server.post_message_url} />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <MiniMetric label="Total tasks" value={snapshot.total_tasks} />
                                        <MiniMetric label="Todo backlog" value={snapshot.todo_count} />
                                    </div>
                                </SectionPanel>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                                <SectionPanel
                                    title="Attention needed"
                                    description="These tasks are blocked or missing enough handoff detail to resume safely."
                                >
                                    {snapshot.attention_tasks.length > 0 ? (
                                        <div className="space-y-3">
                                            {snapshot.attention_tasks.map((task) => (
                                                <AttentionCard
                                                    key={task.task_id}
                                                    task={task}
                                                    onOpenContext={() => controlCenter.openContextTask(task)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No urgent cleanup items right now." />
                                    )}
                                </SectionPanel>

                                <SectionPanel
                                    title="Latest handoffs"
                                    description="The freshest structured memory updates across the workspace."
                                >
                                    {snapshot.latest_handoffs.length > 0 ? (
                                        <div className="space-y-3">
                                            {snapshot.latest_handoffs.map((handoff) => (
                                                <HandoffCard
                                                    key={`${handoff.task_id}-${handoff.timestamp}`}
                                                    handoff={handoff}
                                                    onOpenContext={() => controlCenter.openContextTask(handoff)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No structured handoffs have been recorded yet." />
                                    )}
                                </SectionPanel>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
                                <SectionPanel
                                    title="Ready queue"
                                    description="Pick a task that is unblocked, inspect its memory, then dispatch with a clean resume packet."
                                >
                                    {snapshot.ready_queue.length > 0 ? (
                                        <div className="space-y-3">
                                            {snapshot.ready_queue.map((task) => (
                                                <ReadyQueueCard
                                                    key={task.task_id}
                                                    task={task}
                                                    selected={controlCenter.selectedReadyTask?.task_id === task.task_id}
                                                    onSelect={() => controlCenter.selectReadyTask(task.task_id)}
                                                    onOpenContext={() => controlCenter.openContextTask(task)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState message="No tasks are ready right now. Resolve blockers or add more tasks to the backlog." />
                                    )}
                                </SectionPanel>

                                <SectionPanel
                                    title="Dispatch packet"
                                    description="A focused brief for the currently selected ready task."
                                >
                                    <DispatchPanel
                                        task={controlCenter.selectedReadyTask}
                                        resumeLoading={controlCenter.resumeLoading}
                                        resumeError={controlCenter.resumeError}
                                        resumePacket={controlCenter.resumePacket}
                                        onOpenContext={() =>
                                            controlCenter.selectedReadyTask ? controlCenter.openContextTask(controlCenter.selectedReadyTask) : undefined
                                        }
                                    />
                                </SectionPanel>
                            </div>

                            <SectionPanel
                                title="Audit timeline"
                                description="A running feed of task, dependency, and memory events across the system."
                            >
                                {controlCenter.activity.length > 0 ? (
                                    <div className="space-y-3">
                                        {controlCenter.activity.map((event) => (
                                            <TimelineRow key={event.id} event={event} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState message="No activity has been recorded yet." />
                                )}
                            </SectionPanel>
                        </>
                    ) : null}
                </div>
            </div>

            <TaskContextModal task={controlCenter.contextTask} onClose={controlCenter.closeContextTask} />
        </>
    );
}

function SectionPanel({
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

function StatCard({
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

function MiniMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-zinc-800/70 bg-black/20 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{value}</div>
        </div>
    );
}

function ServerEndpoint({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-1 rounded-2xl border border-zinc-800/70 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-200">{value}</div>
        </div>
    );
}

function AttentionCard({
    task,
    onOpenContext,
}: {
    task: AttentionTaskItem;
    onOpenContext: () => void;
}) {
    return (
        <article className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-white">{task.task_title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[task.task_status]}</div>
                </div>
                <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", priorityClass(task.priority))}>
                    {task.priority}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {task.is_blocked ? (
                    <Badge className="border-rose-500/25 bg-rose-500/10 text-rose-200">
                        {task.blocked_by_open_count} blocker{task.blocked_by_open_count === 1 ? "" : "s"}
                    </Badge>
                ) : null}
                {task.missing_summary ? <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">Missing summary</Badge> : null}
                {task.missing_next_step ? <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">Missing next step</Badge> : null}
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{task.recent_entries} recent entries</Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBlock title="Latest summary" icon={<Brain size={14} className="text-sky-300" />}>
                    {task.latest_summary || "No summary recorded yet."}
                </InfoBlock>
                <InfoBlock title="Next step" icon={<ArrowRight size={14} className="text-emerald-300" />}>
                    {task.latest_next_step || "No next step recorded yet."}
                </InfoBlock>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-400">Clean this handoff before assigning the task to an agent.</div>
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory
                </button>
            </div>
        </article>
    );
}

function HandoffCard({
    handoff,
    onOpenContext,
}: {
    handoff: HandoffPulseItem;
    onOpenContext: () => void;
}) {
    return (
        <article className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-white">{handoff.task_title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[handoff.task_status]}</div>
                </div>
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{formatRelativeTime(handoff.timestamp)}</Badge>
            </div>

            <div className="mt-4 grid gap-3">
                <InfoBlock title="Summary" icon={<Brain size={14} className="text-sky-300" />}>
                    {handoff.summary || "No summary recorded."}
                </InfoBlock>
                <InfoBlock title="Next step" icon={<ArrowRight size={14} className="text-emerald-300" />}>
                    {handoff.next_step || "No next step recorded."}
                </InfoBlock>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-400">{formatTimestamp(handoff.timestamp)}</div>
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory
                </button>
            </div>
        </article>
    );
}

function ReadyQueueCard({
    task,
    selected,
    onSelect,
    onOpenContext,
}: {
    task: ReadyQueueItem;
    selected: boolean;
    onSelect: () => void;
    onOpenContext: () => void;
}) {
    return (
        <article
            className={cn(
                "rounded-[24px] border border-zinc-800/80 bg-black/20 transition",
                selected ? "border-sky-500/35 bg-sky-500/10 shadow-[0_18px_40px_rgba(14,165,233,0.12)]" : "hover:border-zinc-700",
            )}
        >
            <button type="button" onClick={onSelect} className="w-full px-4 py-4 text-left">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-base font-semibold text-white">{task.task_title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[task.task_status]}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", priorityClass(task.priority))}>
                            {task.priority}
                        </span>
                        <Badge className={task.handoff_complete ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}>
                            {task.handoff_complete ? "Handoff ready" : "Handoff incomplete"}
                        </Badge>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <InfoBlock title="Latest summary" icon={<Brain size={14} className="text-sky-300" />}>
                        {task.latest_summary || "No summary captured yet."}
                    </InfoBlock>
                    <InfoBlock title="Next step" icon={<ArrowRight size={14} className="text-emerald-300" />}>
                        {task.latest_next_step || "No next step captured yet."}
                    </InfoBlock>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge className="border-violet-500/25 bg-violet-500/10 text-violet-200">
                        Unblocks {task.blocks_open_count} task{task.blocks_open_count === 1 ? "" : "s"}
                    </Badge>
                    {splitLabels(task.labels).slice(0, 3).map((label) => (
                        <Badge key={label} className="border-zinc-700 bg-zinc-900 text-zinc-300">
                            {label}
                        </Badge>
                    ))}
                    {task.recent_files.slice(0, 2).map((file) => (
                        <Badge key={file} className="border-zinc-700 bg-black/20 text-zinc-400">
                            <FileCode2 size={12} />
                            {file}
                        </Badge>
                    ))}
                </div>
            </button>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-800/70 px-4 py-3">
                <div className="text-sm text-zinc-400">Select this task to inspect its resume packet.</div>
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory
                </button>
            </div>
        </article>
    );
}

function DispatchPanel({
    task,
    resumeLoading,
    resumeError,
    resumePacket,
    onOpenContext,
}: {
    task: ReadyQueueItem | null;
    resumeLoading: boolean;
    resumeError: string | null;
    resumePacket: ResumePacket | null;
    onOpenContext: () => void;
}) {
    if (!task) {
        return <EmptyState message="Select a ready task to generate a dispatch packet." />;
    }

    if (resumeLoading) {
        return (
            <div className="space-y-3">
                <div className="h-16 animate-pulse rounded-2xl bg-zinc-900/70" />
                <div className="h-28 animate-pulse rounded-2xl bg-zinc-900/70" />
                <div className="h-20 animate-pulse rounded-2xl bg-zinc-900/70" />
            </div>
        );
    }

    if (resumeError) {
        return <EmptyState message={resumeError} />;
    }

    if (!resumePacket) {
        return <EmptyState message="No resume packet available for this task yet." />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-lg font-semibold text-white">{task.task_title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[task.task_status]}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge className={resumePacket.handoff_complete ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}>
                            {resumePacket.handoff_complete ? "Handoff complete" : "Needs handoff cleanup"}
                        </Badge>
                        <Badge className={resumePacket.task_state.is_blocked ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"}>
                            {resumePacket.task_state.is_blocked ? "Blocked" : resumePacket.task_state.is_ready ? "Ready" : "Active"}
                        </Badge>
                    </div>
                </div>

                {task.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{task.description}</p>
                ) : null}
            </div>

            <InfoBlock title="Agent brief" icon={<Workflow size={14} className="text-emerald-300" />} className="whitespace-pre-wrap">
                {resumePacket.agent_brief}
            </InfoBlock>

            <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <ListChecks size={14} /> Recommended next actions
                </div>
                <div className="space-y-2">
                    {resumePacket.recommended_next_actions.map((action) => (
                        <div key={action} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
                            {action}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-3">
                <InfoBlock title="Recent files" icon={<GitBranch size={14} className="text-zinc-300" />}>
                    {resumePacket.memory.recent_files.length > 0 ? resumePacket.memory.recent_files.join(", ") : "No files tracked yet."}
                </InfoBlock>
                <InfoBlock title="Open questions" icon={<Flag size={14} className="text-amber-300" />}>
                    {resumePacket.memory.open_questions.length > 0 ? resumePacket.memory.open_questions.join(" • ") : "No open questions recorded."}
                </InfoBlock>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory sheet
                </button>
                <Link
                    to="/workspace"
                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/15"
                >
                    Open workspace <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );
}

function TimelineRow({ event }: { event: ActivityEvent }) {
    return (
        <article className="rounded-[24px] border border-zinc-800/80 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-white">{event.title}</div>
                    <div className="mt-1 text-sm leading-relaxed text-zinc-400">{event.summary}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Badge className={SOURCE_STYLES[event.source] || SOURCE_STYLES.system}>{event.source}</Badge>
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{event.actor}</Badge>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span>{formatTimestamp(event.created_at)}</span>
                <span>{formatRelativeTime(event.created_at)}</span>
                {event.task_title ? <span className="text-zinc-400">Task: {event.task_title}</span> : null}
            </div>
        </article>
    );
}

function InfoBlock({
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

function Badge({ className, children }: { className: string; children: ReactNode }) {
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", className)}>
            {children}
        </span>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-[24px] border border-dashed border-zinc-800/80 bg-zinc-950/50 px-4 py-8 text-center text-sm leading-7 text-zinc-500">
            {message}
        </div>
    );
}

function LoadingState() {
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
