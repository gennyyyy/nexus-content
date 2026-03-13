import { useState, useCallback, type ReactNode } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    ConnectionMode,
    Controls,
    MiniMap,
    ReactFlow,
    type Connection,
    type Edge,
    type Node,
    type OnEdgesChange,
    type OnNodesChange,
} from "@xyflow/react";
import { Brain, Link2, Maximize2, Minimize2 } from "lucide-react";
import type { Task, TaskDependency, TaskMemorySummary, TaskOperationalState } from "../../lib/api";
import { DEPENDENCY_META, STATUS_META, nodeTypes, type DependencyType } from "./constants";
import { getFlowBadge, nextStep, taskSummary } from "./utils";
import { EmptyState, Tag } from "./WorkspacePrimitives";
import { TaskHistoryPanel } from "../../components/TaskHistoryPanel";
import type { FlowBadge, InspectorDraft } from "./types";

interface Props {
    tasks: Task[];
    visibleTasks: Task[];
    memoryByTask: Map<number, TaskMemorySummary>;
    operationalByTask: Map<number, TaskOperationalState>;
    visibleNodes: Node[];
    visibleEdges: Edge[];
    loading: boolean;
    savingEdge: boolean;
    dependencyType: DependencyType;
    selectedTask: Task | null;
    selectedMemory?: TaskMemorySummary;
    selectedState?: TaskOperationalState;
    selectedFlow: FlowBadge;
    selectedDependency?: TaskDependency;
    inspectorDraft: InspectorDraft;
    onInspectorFieldChange: (field: keyof InspectorDraft, value: string) => void;
    onSelectTask: (task: Task) => void;
    onOpenContext: (task: Task) => void;
    onSaveTaskDetails: () => void | Promise<void>;
    onDeleteSelectedTask: () => void | Promise<void>;
    onStatusChange: (status: Task["status"]) => void | Promise<void>;
    onDeleteSelectedEdge: () => void | Promise<void>;
    onConnect: (connection: Connection) => void | Promise<void>;
    onNodesChange: OnNodesChange<Node>;
    onEdgesChange: OnEdgesChange<Edge>;
    onSelectEdge: (edgeId: string) => void;
}

export function AdvancedWorkspaceView({
    tasks,
    visibleTasks,
    memoryByTask,
    operationalByTask,
    visibleNodes,
    visibleEdges,
    loading,
    savingEdge,
    dependencyType,
    selectedTask,
    selectedMemory,
    selectedState,
    selectedFlow,
    selectedDependency,
    inspectorDraft,
    onInspectorFieldChange,
    onSelectTask,
    onOpenContext,
    onSaveTaskDetails,
    onDeleteSelectedTask,
    onStatusChange,
    onDeleteSelectedEdge,
    onConnect,
    onNodesChange,
    onEdgesChange,
    onSelectEdge,
}: Props) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);

    const requestConfirm = useCallback((title: string, message: string, action: () => void) => {
        setConfirmAction({ title, message, action });
    }, []);

    const dependencyBadgeClass =
        DEPENDENCY_META[dependencyType as keyof typeof DEPENDENCY_META]?.badge ||
        "border-sky-500/30 bg-sky-500/10 text-sky-200";
    const selectedDependencyBadgeClass = selectedDependency
        ? DEPENDENCY_META[selectedDependency.type as keyof typeof DEPENDENCY_META]?.badge ||
        "border-sky-500/30 bg-sky-500/10 text-sky-200"
        : "";

    return (
        <div className={`grid min-h-0 flex-1 gap-5 ${isFullscreen ? "grid-cols-1" : "xl:grid-cols-[300px_minmax(0,1.85fr)_360px]"}`}>
            {!isFullscreen && (
                <aside className="surface-panel animate-fade-up flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/5 shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
                    <div className="border-b border-zinc-800/70 px-5 py-4">
                        <h2 className="text-lg font-semibold text-zinc-50">Visible graph tasks</h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                            Browse the filtered task set, then jump into the canvas with one click.
                        </p>
                    </div>

                    <div className="nexus-scroll min-h-0 space-y-3 overflow-y-auto p-4">
                        {visibleTasks.length > 0 ? (
                            visibleTasks.map((task) => {
                                const memory = task.id ? memoryByTask.get(task.id) : undefined;
                                const flow = task.id ? getFlowBadge(task, operationalByTask.get(task.id)) : null;

                                return (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => onSelectTask(task)}
                                        className={`block w-full rounded-[22px] border p-3.5 text-left transition-all duration-200 ${selectedTask?.id === task.id
                                            ? "border-sky-400/40 bg-sky-500/10 shadow-[0_18px_40px_rgba(14,165,233,0.12)]"
                                            : "border-zinc-800/90 bg-zinc-950/78 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-950"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-zinc-100">{task.title}</div>
                                                <div className="mt-2 line-clamp-2 text-xs leading-6 text-zinc-400">
                                                    {taskSummary(task, memory)}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <Tag className={STATUS_META[task.status].badge}>{STATUS_META[task.status].label}</Tag>
                                                {flow ? <Tag className={flow[1]}>{flow[0]}</Tag> : null}
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-[11px] leading-5 text-zinc-300">
                                            <span className="text-zinc-500">Next:</span> {nextStep(memory)}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <EmptyState message="No tasks match the current filters." />
                        )}
                    </div>
                </aside>
            )}

            <section
                className={`surface-panel animate-fade-up-delay-1 flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/5 shadow-[0_30px_75px_rgba(2,6,23,0.45)] ${isFullscreen
                    ? "bg-zinc-950/60"
                    : "bg-zinc-950/40"
                    }`}
            >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-2">
                        {isFullscreen ? (
                            <>
                                <CanvasStat label="Tasks" value={String(visibleNodes.length)} />
                                <CanvasStat label="Links" value={String(visibleEdges.length)} />
                            </>
                        ) : null}

                        <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-[0_12px_30px_rgba(2,6,23,0.28)] backdrop-blur-md ${dependencyBadgeClass}`}>
                            <Link2 size={14} />
                            {savingEdge ? "Saving..." : dependencyType}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-xs font-semibold text-zinc-200 shadow-[0_12px_30px_rgba(2,6,23,0.28)] transition hover:border-zinc-600 hover:bg-zinc-950"
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen graph"}
                        >
                            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            {isFullscreen ? "Exit focus" : "Focus mode"}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex h-full min-h-[640px] items-center justify-center text-zinc-500">
                            Loading graph...
                        </div>
                    ) : (
                        <>
                            <div
                                className={`pointer-events-none absolute inset-0 ${isFullscreen
                                    ? "bg-[linear-gradient(to_right,rgba(63,63,70,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,63,70,0.04)_1px,transparent_1px)] bg-[size:56px_56px]"
                                    : "bg-[linear-gradient(to_right,rgba(63,63,70,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,63,70,0.07)_1px,transparent_1px)] bg-[size:48px_48px]"
                                    }`}
                            />
                            <div
                                className={`pointer-events-none absolute inset-0 ${isFullscreen
                                    ? "bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.055),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.045),transparent_26%)]"
                                    : "bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.12),transparent_32%)]"
                                    }`}
                            />

                            {isFullscreen && selectedTask ? (
                                <div className="absolute left-4 bottom-4 z-10 max-w-[340px]">
                                    <FocusOverlayCard>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                                    Selected task
                                                </div>
                                                <div className="mt-1 text-sm font-semibold text-zinc-100">{selectedTask.title}</div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                <Tag className={STATUS_META[selectedTask.status].badge}>
                                                    {STATUS_META[selectedTask.status].label}
                                                </Tag>
                                                {selectedFlow ? <Tag className={selectedFlow[1]}>{selectedFlow[0]}</Tag> : null}
                                            </div>
                                        </div>

                                        <div className="mt-3 text-xs leading-6 text-zinc-300">
                                            {taskSummary(selectedTask, selectedMemory)}
                                        </div>

                                        <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-[11px] leading-5 text-zinc-300">
                                            <span className="text-zinc-500">Next:</span> {nextStep(selectedMemory)}
                                        </div>

                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onOpenContext(selectedTask)}
                                                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-600"
                                            >
                                                <Brain size={14} />
                                                Open Memory
                                            </button>
                                        </div>
                                    </FocusOverlayCard>
                                </div>
                            ) : null}

                            {isFullscreen && selectedDependency ? (
                                <div className="absolute right-4 bottom-4 z-10 max-w-[320px]">
                                    <FocusOverlayCard>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                            Selected link
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <Tag className={selectedDependencyBadgeClass}>{selectedDependency.type}</Tag>
                                        </div>
                                        <p className="mt-3 text-xs leading-6 text-zinc-300">
                                            {tasks.find((task) => task.id === selectedDependency.source_task_id)?.title ||
                                                selectedDependency.source_task_id}{" "}
                                            <span className="text-zinc-500">({selectedDependency.type})</span> {"->"}{" "}
                                            {tasks.find((task) => task.id === selectedDependency.target_task_id)?.title ||
                                                selectedDependency.target_task_id}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => requestConfirm("Delete Link", "Are you sure you want to remove this dependency link? This cannot be undone.", () => void onDeleteSelectedEdge())}
                                            className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/16"
                                            aria-label="Delete selected dependency link"
                                        >
                                            Delete Link
                                        </button>
                                    </FocusOverlayCard>
                                </div>
                            ) : null}

                            <ReactFlow
                                className="!bg-transparent"
                                nodes={visibleNodes}
                                edges={visibleEdges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={(connection) => void onConnect(connection)}
                                connectionMode={ConnectionMode.Strict}
                                connectionLineType={ConnectionLineType.SmoothStep}
                                connectionLineStyle={{ stroke: "#8dd3ff", strokeWidth: 2.2 }}
                                fitView
                                fitViewOptions={{ padding: isFullscreen ? 0.1 : 0.14 }}
                                colorMode="dark"
                                nodeTypes={nodeTypes}
                                defaultEdgeOptions={{ type: "smoothstep" }}
                                minZoom={0.35}
                                onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
                                onNodeClick={(_, node) => {
                                    const task = tasks.find((item) => String(item.id) === node.id);
                                    if (task) onSelectTask(task);
                                }}
                            >
                                <Controls className="rounded-2xl border border-zinc-800 bg-zinc-950/92 fill-white shadow-[0_12px_30px_rgba(2,6,23,0.4)]" />
                                <MiniMap
                                    nodeColor={(node) => {
                                        const task = tasks.find((item) => String(item.id) === node.id);
                                        return task ? STATUS_META[task.status].color : "#27272a";
                                    }}
                                    maskColor="rgba(2, 6, 23, 0.82)"
                                    className="rounded-2xl border border-zinc-800 bg-zinc-950/92 shadow-[0_12px_30px_rgba(2,6,23,0.4)]"
                                />
                                <Background variant={BackgroundVariant.Dots} gap={26} size={1.35} color={isFullscreen ? "#1f2937" : "#223042"} />
                            </ReactFlow>
                        </>
                    )}
                </div>
            </section>

            {!isFullscreen && (
                <aside className="surface-panel animate-fade-up-delay-2 nexus-scroll min-h-0 overflow-y-auto rounded-[28px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.94))] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
                    {selectedTask ? (
                        <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Inspector</div>
                                    <h2 className="mt-2 text-2xl font-semibold text-zinc-50">{selectedTask.title}</h2>
                                    <p className="mt-2 text-sm leading-7 text-zinc-400">
                                        {selectedTask.description || "No description captured yet."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onOpenContext(selectedTask)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-600"
                                >
                                    <Brain size={14} />
                                    Open Memory
                                </button>
                            </div>

                            <InspectorCard title="Task details">
                                <div className="grid gap-3">
                                    <input
                                        value={inspectorDraft.title}
                                        onChange={(event) => onInspectorFieldChange("title", event.target.value)}
                                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500/60"
                                    />
                                    <textarea
                                        value={inspectorDraft.description}
                                        onChange={(event) => onInspectorFieldChange("description", event.target.value)}
                                        className="min-h-[120px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500/60"
                                    />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <select
                                            value={inspectorDraft.priority}
                                            onChange={(event) => onInspectorFieldChange("priority", event.target.value)}
                                            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                        <input
                                            value={inspectorDraft.labels}
                                            onChange={(event) => onInspectorFieldChange("labels", event.target.value)}
                                            placeholder="labels,comma,separated"
                                            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500/60"
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => void onSaveTaskDetails()}
                                            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm font-semibold text-zinc-100 transition hover:-translate-y-0.5 hover:border-zinc-600"
                                        >
                                            Save Details
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => requestConfirm("Delete Task", `Are you sure you want to delete "${selectedTask.title}"? All context entries and dependencies will be permanently removed.`, () => void onDeleteSelectedTask())}
                                            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-sm font-semibold text-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-500/16"
                                            aria-label="Delete selected task"
                                        >
                                            Delete Task
                                        </button>
                                    </div>
                                </div>
                            </InspectorCard>

                            <InspectorCard title="Flow and status">
                                <div className="flex flex-wrap gap-2">
                                    {(["todo", "in_progress", "done"] as const).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => void onStatusChange(status)}
                                            className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${selectedTask.status === status ? STATUS_META[status].badge : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"}`}
                                        >
                                            {STATUS_META[status].label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Tag className={STATUS_META[selectedTask.status].badge}>{STATUS_META[selectedTask.status].label}</Tag>
                                    {selectedFlow ? <Tag className={selectedFlow[1]}>{selectedFlow[0]}</Tag> : null}
                                    <Tag className="border-zinc-700 bg-zinc-950 text-zinc-300">
                                        {selectedState?.blocked_by_open_count || 0} blockers
                                    </Tag>
                                </div>

                                <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-black/20 px-4 py-3 text-sm leading-7 text-zinc-300">
                                    <span className="text-zinc-500">Next:</span> {nextStep(selectedMemory)}
                                </div>
                            </InspectorCard>

                            {selectedDependency ? (
                                <InspectorCard title="Selected link">
                                    <div className="flex flex-wrap gap-2">
                                        <Tag className={selectedDependencyBadgeClass}>{selectedDependency.type}</Tag>
                                    </div>
                                    <p className="mt-3 text-sm leading-7 text-zinc-300">
                                        {tasks.find((task) => task.id === selectedDependency.source_task_id)?.title ||
                                            selectedDependency.source_task_id}{" "}
                                        <span className="text-zinc-500">({selectedDependency.type})</span> {"->"}{" "}
                                        {tasks.find((task) => task.id === selectedDependency.target_task_id)?.title ||
                                            selectedDependency.target_task_id}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => requestConfirm("Delete Link", "Are you sure you want to remove this dependency link? This cannot be undone.", () => void onDeleteSelectedEdge())}
                                        className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/16"
                                        aria-label="Delete selected dependency link"
                                    >
                                        Delete Link
                                    </button>
                                </InspectorCard>
                            ) : null}

                            <InspectorCard title="Audit History">
                                <TaskHistoryPanel taskId={selectedTask.id!} />
                            </InspectorCard>
                        </div>
                    ) : (
                        <EmptyState message="Select a task from the graph or left rail to inspect it here." />
                    )}
                </aside>
            )}
            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.title ?? ""}
                message={confirmAction?.message ?? ""}
                confirmLabel="Delete"
                onConfirm={() => {
                    confirmAction?.action();
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
}

function CanvasStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-zinc-200">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-current/70">{label}</div>
            <div className="mt-1 text-sm font-semibold text-current">{value}</div>
        </div>
    );
}

function FocusOverlayCard({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[22px] border border-zinc-800/80 bg-zinc-950/82 px-4 py-3 shadow-[0_18px_45px_rgba(2,6,23,0.32)] backdrop-blur-md ${className}`}
        >
            {children}
        </div>
    );
}

function InspectorCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-[24px] border border-zinc-800/80 bg-zinc-950/72 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</div>
            {children}
        </div>
    );
}
