import {
    Activity,
    AlertTriangle,
    Brain,
    CheckCircle2,
    Clock3,
    RefreshCw,
    Search,
    Server,
    Workflow,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { TaskContextModal } from "../components/TaskContextModal";
import { useControlCenter } from "./control-center/useControlCenter";
import { ChartsSection } from "./control-center/ChartsSection";
import {
    AttentionCard,
    DispatchPanel,
    HandoffCard,
    ReadyQueueCard,
    TimelineRow,
} from "./control-center/ControlCenterCards";
import {
    LoadingState,
    MiniMetric,
    SectionPanel,
    ServerEndpoint,
    StatCard,
    EmptyState,
} from "./control-center/ControlCenterPrimitives";
import { MetricsPanel } from "./control-center/MetricsPanel";
import { formatTimestamp } from "./control-center/utils";

export function ControlCenter() {
    const { projectId } = useParams();
    const controlCenter = useControlCenter(projectId);
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

                            <ChartsSection snapshot={snapshot} activity={controlCenter.activity} />

                            <MetricsPanel
                                metrics={controlCenter.metrics}
                                loading={controlCenter.metricsLoading}
                                error={controlCenter.metricsError}
                            />

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
                                        projectId={projectId}
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
                                <div className="relative">
                                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="search"
                                        value={controlCenter.activitySearch}
                                        onChange={(event) => controlCenter.setActivitySearch(event.target.value)}
                                        placeholder="Search activity by task, summary, actor, or event type"
                                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 py-3 pl-9 pr-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500/40"
                                    />
                                </div>
                                {controlCenter.activity.length > 0 ? (
                                            <div className="space-y-3">
                                                {controlCenter.activity.map((event) => (
                                            <TimelineRow
                                                key={event.id}
                                                event={event}
                                                onOpenContext={event.task_id ? () => controlCenter.openActivityContextTask(event) : undefined}
                                            />
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
