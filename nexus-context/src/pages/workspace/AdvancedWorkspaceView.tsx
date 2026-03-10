import { useState } from "react";
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
import { Link2, Maximize2, Minimize2 } from "lucide-react";
import type { Task, TaskDependency, TaskMemorySummary, TaskOperationalState } from "../../lib/api";
import { STATUS_META, nodeTypes, type DependencyType } from "./constants";
import { nextStep, taskSummary, getFlowBadge } from "./utils";
import { EmptyState, Tag } from "./WorkspacePrimitives";
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

    return (
        <div className={`grid min-h-0 flex-1 gap-4 ${isFullscreen ? "grid-cols-1" : "xl:grid-cols-[280px_minmax(0,1.7fr)_340px]"}`}>
            {/* Task List — hidden when fullscreen */}
            {!isFullscreen && (
                <div className="surface-panel animate-fade-up flex min-h-0 flex-col overflow-hidden">
                    <div className="border-b border-zinc-800/70 px-4 py-3">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Tasks</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Graph-first orchestration.
                        </p>
                    </div>

                    <div className="nexus-scroll min-h-0 space-y-2 overflow-y-auto p-3">
                        {visibleTasks.length > 0 ? (
                            visibleTasks.map((task) => {
                                const memory = task.id ? memoryByTask.get(task.id) : undefined;
                                const flow = task.id ? getFlowBadge(task, operationalByTask.get(task.id)) : null;
                                return (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => onSelectTask(task)}
                                        className={`block w-full border p-2.5 text-left transition-all duration-200 ${selectedTask?.id === task.id ? "border-sky-400/45 bg-sky-500/10" : "border-zinc-800 bg-zinc-950/75 hover:border-zinc-700 hover:bg-zinc-950"}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-zinc-100">{task.title}</div>
                                                <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-400">
                                                    {taskSummary(task, memory)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Tag className={STATUS_META[task.status].badge}>
                                                    {STATUS_META[task.status].label}
                                                </Tag>
                                                {flow ? <Tag className={flow[1]}>{flow[0]}</Tag> : null}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <EmptyState message="No tasks match the current filters." />
                        )}
                    </div>
                </div>
            )}

            {/* Dependency Graph */}
            <div className="surface-panel animate-fade-up-delay-1 flex min-h-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Dependency Graph</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">{isFullscreen ? "Fullscreen mode — graph only." : "Connect nodes to create dependencies."}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300">
                            <Link2 size={14} />
                            {savingEdge ? "Saving..." : `"${dependencyType}"`}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className="border border-zinc-700 bg-zinc-950 p-2 text-zinc-300 transition-colors duration-150 hover:border-zinc-600 hover:text-white"
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen graph"}
                        >
                            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </div>
                </div>

                <div className="relative min-h-0 flex-1">
                    {loading ? (
                        <div className="flex h-full min-h-[600px] items-center justify-center text-zinc-500">
                            Loading graph...
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={visibleNodes}
                            edges={visibleEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={(connection) => void onConnect(connection)}
                            connectionMode={ConnectionMode.Strict}
                            connectionLineType={ConnectionLineType.Step}
                            connectionLineStyle={{ stroke: "#8dd3ff", strokeWidth: 2.2 }}
                            fitView
                            fitViewOptions={{ padding: 0.16 }}
                            colorMode="dark"
                            nodeTypes={nodeTypes}
                            defaultEdgeOptions={{ type: "step" }}
                            minZoom={0.35}
                            onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
                            onNodeClick={(_, node) => {
                                const task = tasks.find((item) => String(item.id) === node.id);
                                if (task) onSelectTask(task);
                            }}
                        >
                            <Controls className="border-zinc-800 bg-zinc-950/95 fill-white" />
                            <MiniMap
                                nodeColor={(node) => {
                                    const task = tasks.find((item) => String(item.id) === node.id);
                                    return task ? STATUS_META[task.status].color : "#27272a";
                                }}
                                maskColor="rgba(2, 6, 23, 0.78)"
                                className="border border-zinc-800 bg-zinc-950/95"
                            />
                            <Background variant={BackgroundVariant.Cross} gap={28} size={1.1} color="#1f2937" />
                        </ReactFlow>
                    )}
                </div>
            </div>

            {/* Inspector — hidden when fullscreen */}
            {!isFullscreen && (
                <div className="surface-panel animate-fade-up-delay-2 nexus-scroll min-h-0 overflow-y-auto p-4">
                    {selectedTask ? (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                        Inspector
                                    </div>
                                    <h2 className="mt-1.5 text-xl font-semibold text-zinc-50">{selectedTask.title}</h2>
                                    <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                                        {selectedTask.description || "No description captured yet."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onOpenContext(selectedTask)}
                                    className="border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors duration-150 hover:border-zinc-600"
                                >
                                    Open Memory
                                </button>
                            </div>

                            <div className="grid gap-2">
                                <input
                                    value={inspectorDraft.title}
                                    onChange={(event) => onInspectorFieldChange("title", event.target.value)}
                                    className="w-full border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors duration-150 focus:border-zinc-600"
                                />
                                <textarea
                                    value={inspectorDraft.description}
                                    onChange={(event) => onInspectorFieldChange("description", event.target.value)}
                                    className="min-h-[100px] w-full border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors duration-150 focus:border-zinc-600"
                                />
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <select
                                        value={inspectorDraft.priority}
                                        onChange={(event) => onInspectorFieldChange("priority", event.target.value)}
                                        className="w-full border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
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
                                        className="w-full border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors duration-150 focus:border-zinc-600"
                                    />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => void onSaveTaskDetails()}
                                        className="border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-100 transition-colors duration-150 hover:border-zinc-600 hover:bg-zinc-900"
                                    >
                                        Save Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void onDeleteSelectedTask()}
                                        className="border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-200 transition-colors duration-150 hover:bg-rose-500/16"
                                    >
                                        Delete Task
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {(["todo", "in_progress", "done"] as const).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => void onStatusChange(status)}
                                        className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors duration-150 ${selectedTask.status === status ? STATUS_META[status].badge : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"}`}
                                    >
                                        {STATUS_META[status].label}
                                    </button>
                                ))}
                            </div>

                            <div className="border border-zinc-800/70 bg-zinc-950/70 p-3">
                                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                    Flow
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <Tag className={STATUS_META[selectedTask.status].badge}>
                                        {STATUS_META[selectedTask.status].label}
                                    </Tag>
                                    {selectedFlow ? <Tag className={selectedFlow[1]}>{selectedFlow[0]}</Tag> : null}
                                    <Tag className="border-zinc-700 bg-zinc-950 text-zinc-300">
                                        {selectedState?.blocked_by_open_count || 0} blockers
                                    </Tag>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-zinc-300">{nextStep(selectedMemory)}</p>
                            </div>

                            {selectedDependency ? (
                                <div className="border border-zinc-800/70 bg-zinc-950/70 p-3">
                                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                        Selected Link
                                    </div>
                                    <p className="text-sm leading-6 text-zinc-300">
                                        {tasks.find((task) => task.id === selectedDependency.source_task_id)?.title ||
                                            selectedDependency.source_task_id}{" "}
                                        <span className="text-zinc-500">({selectedDependency.type})</span> {"->"}{" "}
                                        {tasks.find((task) => task.id === selectedDependency.target_task_id)?.title ||
                                            selectedDependency.target_task_id}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void onDeleteSelectedEdge()}
                                        className="mt-2 border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-semibold text-rose-200 transition-colors duration-150 hover:bg-rose-500/16"
                                    >
                                        Delete Link
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <EmptyState message="Select a task from the graph or left rail to inspect it here." />
                    )}
                </div>
            )}
        </div>
    );
}
