import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Brain, GripVertical } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { Task, TaskMemorySummary, TaskOperationalState } from "../../lib/api";
import { BOARD_COLUMNS, PRIORITY_BADGES, STATUS_META } from "./constants";
import { getFlowBadge, nextStep, normalizePriority, taskSummary } from "./utils";
import { EmptyState, Tag } from "./WorkspacePrimitives";
import { TaskHistoryPanel } from "../../components/TaskHistoryPanel";
import type { FlowBadge, InspectorDraft, TaskBuckets } from "./types";

interface Props {
    tasksByStatus: TaskBuckets;
    memoryByTask: Map<number, TaskMemorySummary>;
    operationalByTask: Map<number, TaskOperationalState>;
    readyTasks: Task[];
    selectedTask: Task | null;
    selectedMemory?: TaskMemorySummary;
    selectedState?: TaskOperationalState;
    selectedFlow: FlowBadge;
    inspectorDraft: InspectorDraft;
    onInspectorFieldChange: (field: keyof InspectorDraft, value: string) => void;
    onSaveTaskDetails: () => void | Promise<void>;
    onDeleteSelectedTask: () => void | Promise<void>;
    onStatusChange: (status: Task["status"]) => void | Promise<void>;
    onBoardDragEnd: (result: DropResult) => void | Promise<void>;
    onQuickOpenTask: (task: Task) => void;
    onOpenContext: (task: Task) => void;
}

export function EasyWorkspaceView({
    tasksByStatus,
    memoryByTask,
    operationalByTask,
    readyTasks,
    selectedTask,
    selectedMemory,
    selectedState,
    selectedFlow,
    inspectorDraft,
    onInspectorFieldChange,
    onSaveTaskDetails,
    onDeleteSelectedTask,
    onStatusChange,
    onBoardDragEnd,
    onQuickOpenTask,
    onOpenContext,
}: Props) {
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
    const [inspectorTab, setInspectorTab] = useState<"details" | "history">("details");

    const requestConfirm = useCallback((title: string, message: string, action: () => void) => {
        setConfirmAction({ title, message, action });
    }, []);

    return (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
            {/* Kanban Board */}
            <div className="surface-panel animate-fade-up flex min-h-0 flex-col overflow-hidden">
                <div className="border-b border-zinc-800/70 px-4 py-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Easy Mode</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">Drag tasks between lanes to update status.</p>
                </div>

                <DragDropContext onDragEnd={(result) => void onBoardDragEnd(result)}>
                    <div className="grid min-h-0 flex-1 gap-3 p-3 2xl:grid-cols-3">
                        {BOARD_COLUMNS.map((column) => {
                            const columnTasks = tasksByStatus[column.id];
                            return (
                                <div
                                    key={column.id}
                                    className={`flex min-h-0 flex-col border ${STATUS_META[column.id].border} bg-zinc-950/65`}
                                >
                                    <div className="border-b border-zinc-800/60 px-3 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-50">
                                                    {column.title}
                                                </h3>
                                                <p className="mt-0.5 text-xs text-zinc-500">{column.description}</p>
                                            </div>
                                            <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                                                {columnTasks.length}
                                            </span>
                                        </div>
                                    </div>

                                    <Droppable
                                        droppableId={column.id}
                                        renderClone={(provided, _snapshot, rubric) => {
                                            const task = columnTasks[rubric.source.index];
                                            const memory = task?.id ? memoryByTask.get(task.id) : undefined;
                                            return (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="border border-sky-400/45 bg-zinc-900 p-2.5 shadow-[0_20px_50px_rgba(2,6,23,0.6)]"
                                                >
                                                    <div className="text-sm font-semibold text-zinc-100">{task?.title}</div>
                                                    <div className="mt-1 text-xs text-zinc-400 line-clamp-1">
                                                        {taskSummary(task, memory)}
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`nexus-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3 transition-colors duration-200 ${snapshot.isDraggingOver ? "bg-zinc-900/35" : ""}`}
                                            >
                                                <AnimatePresence mode="popLayout">
                                                    {columnTasks.map((task, index) => {
                                                        const memory = task.id ? memoryByTask.get(task.id) : undefined;
                                                        const opState = task.id ? operationalByTask.get(task.id) : undefined;
                                                    const flow = task.id ? getFlowBadge(task, opState) : null;

                                                    const isHot = task.priority === "critical" || (opState?.blocked_by_open_count ?? 0) >= 2;
                                                    const hotClass = isHot ? "border-rose-500/50 shadow-[inset_0_0_20px_rgba(225,29,72,0.15)]" : "border-white/5";

                                                    return (
                                                        <Draggable key={String(task.id)} draggableId={String(task.id)} index={index}>
                                                            {(dragProvided, dragSnapshot) => (
                                                                <motion.div
                                                                    layout
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    ref={dragProvided.innerRef}
                                                                    {...dragProvided.draggableProps}
                                                                    className={`border bg-zinc-900/40 backdrop-blur-md p-2.5 transition-all duration-200 ${dragSnapshot.isDragging ? "border-sky-400/45 shadow-[0_16px_40px_rgba(2,6,23,0.5)]" : `hover:border-white/20 hover:bg-zinc-900/60 ${hotClass}`}`}
                                                                >
                                                                    <div className="flex items-start gap-2.5">
                                                                        <button
                                                                            type="button"
                                                                            {...dragProvided.dragHandleProps}
                                                                            className={`border bg-zinc-900/40 p-1.5 text-zinc-500 transition-colors duration-150 hover:text-zinc-200 cursor-grab active:cursor-grabbing ${isHot ? "border-rose-500/30" : "border-white/5"}`}
                                                                            aria-label={`Drag ${task.title}`}
                                                                        >
                                                                            <GripVertical size={14} />
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onQuickOpenTask(task)}
                                                                            className="min-w-0 flex-1 text-left"
                                                                        >
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="min-w-0">
                                                                                    <div className="truncate text-sm font-semibold text-zinc-100">
                                                                                        {task.title}
                                                                                    </div>
                                                                                    <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-400">
                                                                                        {taskSummary(task, memory)}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-col items-end gap-1">
                                                                                    <Tag className={STATUS_META[task.status].badge}>
                                                                                        {STATUS_META[task.status].label}
                                                                                    </Tag>
                                                                                    <Tag className={PRIORITY_BADGES[normalizePriority(task.priority)]}>
                                                                                        {normalizePriority(task.priority)}
                                                                                    </Tag>
                                                                                    {flow ? <Tag className={flow[1]}>{flow[0]}</Tag> : null}
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-2 border border-zinc-800 bg-zinc-950/85 px-2.5 py-1.5 text-[12px] leading-5 text-zinc-300">
                                                                                <span className="text-zinc-500">Next:</span> {nextStep(memory)}
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                </AnimatePresence>
                                                {provided.placeholder}
                                                {columnTasks.length === 0 ? <EmptyState message="No tasks in this lane." /> : null}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            </div>

            {/* Right Sidebar — Ready Queue + Editable Inspector */}
            <div className="flex min-h-0 flex-col gap-4">
                <div className="surface-panel animate-fade-up-delay-1 flex min-h-0 flex-col overflow-hidden">
                    <div className="border-b border-zinc-800/70 px-4 py-3">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Ready Queue</h3>
                    </div>
                    <div className="nexus-scroll min-h-0 space-y-2 overflow-y-auto p-3">
                        {readyTasks.length > 0 ? (
                            readyTasks.map((task) => (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => onQuickOpenTask(task)}
                                    className="block w-full border border-zinc-800 bg-zinc-950/75 p-2.5 text-left transition-all duration-200 hover:border-emerald-400/40 hover:bg-zinc-950"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-zinc-100">{task.title}</div>
                                            <div className="mt-1.5 text-xs leading-5 text-zinc-400">
                                                {nextStep(task.id ? memoryByTask.get(task.id) : undefined)}
                                            </div>
                                        </div>
                                        <Tag className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                                            Ready
                                        </Tag>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <EmptyState message="No tasks are ready under the current filters." />
                        )}
                    </div>
                </div>

                {/* Editable Inspector */}
                <div className="surface-panel animate-fade-up-delay-2 nexus-scroll min-h-0 flex-1 overflow-y-auto p-4">
                    <AnimatePresence mode="wait">
                        {selectedTask ? (
                            <motion.div
                                key={selectedTask.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Inspector</div>
                                        <h3 className="mt-1 text-lg font-semibold text-zinc-50">{selectedTask.title}</h3>
                                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                                            {selectedTask.description || "No description captured yet."}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onOpenContext(selectedTask)}
                                        className="shrink-0 border border-white/5 bg-zinc-900/40 backdrop-blur-md px-2.5 py-1.5 text-xs font-semibold text-zinc-100 transition-colors duration-150 hover:border-white/10"
                                    >
                                        <Brain size={14} className="inline mr-1" />
                                        Memory
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-4 border-b border-zinc-800/80 mb-4 pb-2">
                                    <button
                                        onClick={() => setInspectorTab("details")}
                                        className={`text-[10px] font-semibold uppercase tracking-wider ${inspectorTab === "details" ? "text-sky-400" : "text-zinc-500 hover:text-zinc-400"}`}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={() => setInspectorTab("history")}
                                        className={`text-[10px] font-semibold uppercase tracking-wider ${inspectorTab === "history" ? "text-sky-400" : "text-zinc-500 hover:text-zinc-400"}`}
                                    >
                                        History
                                    </button>
                                </div>

                                {inspectorTab === "details" ? (
                                    <>
                                        {/* Editable Fields */}
                                        <div className="grid gap-2">
                                            <input
                                                value={inspectorDraft.title}
                                                onChange={(e) => onInspectorFieldChange("title", e.target.value)}
                                                placeholder="Title"
                                                className="w-full border border-zinc-800 bg-zinc-900/40 backdrop-blur-md px-3 py-2 text-sm text-zinc-100 outline-none transition-colors duration-150 focus:border-zinc-600"
                                            />
                                            <textarea
                                                value={inspectorDraft.description}
                                                onChange={(e) => onInspectorFieldChange("description", e.target.value)}
                                                placeholder="Description"
                                                className="min-h-[80px] w-full resize-y border border-zinc-800 bg-zinc-900/40 backdrop-blur-md px-3 py-2 text-sm text-zinc-100 outline-none transition-colors duration-150 focus:border-zinc-600"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={inspectorDraft.priority}
                                                    onChange={(e) => onInspectorFieldChange("priority", e.target.value)}
                                                    className="w-full border border-zinc-800 bg-zinc-900/40 backdrop-blur-md px-3 py-2 text-sm text-zinc-100 outline-none"
                                                >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                    <option value="critical">Critical</option>
                                                </select>
                                                <input
                                                    value={inspectorDraft.labels}
                                                    onChange={(e) => onInspectorFieldChange("labels", e.target.value)}
                                                    placeholder="labels"
                                                    className="w-full border border-zinc-800 bg-zinc-900/40 backdrop-blur-md px-3 py-2 text-sm text-zinc-100 outline-none transition-colors duration-150 focus:border-zinc-600"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void onSaveTaskDetails()}
                                                    className="border border-white/5 bg-zinc-900/40 backdrop-blur-md px-3 py-2 text-sm font-semibold text-zinc-100 transition-colors duration-150 hover:border-white/10 hover:bg-zinc-900/60"
                                                >
                                                    Save Details
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => requestConfirm("Delete Task", `Are you sure you want to delete "${selectedTask.title}"? All context entries and dependencies will be permanently removed.`, () => void onDeleteSelectedTask())}
                                                    className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition-colors duration-150 hover:bg-rose-500/16"
                                                    aria-label="Delete selected task"
                                                >
                                                    Delete Task
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status Buttons */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {(["todo", "in_progress", "done"] as const).map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => void onStatusChange(status)}
                                                    className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors duration-150 ${selectedTask.status === status ? STATUS_META[status].badge : "border-white/5 bg-zinc-900/40 backdrop-blur-md text-zinc-400 hover:border-white/10 hover:text-zinc-100"}`}
                                                >
                                                    {STATUS_META[status].label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Flow + Next Step */}
                                        <div className="border border-white/5 bg-zinc-900/40 backdrop-blur-md p-3">
                                            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Flow</div>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                <Tag className={STATUS_META[selectedTask.status].badge}>
                                                    {STATUS_META[selectedTask.status].label}
                                                </Tag>
                                                {selectedFlow ? <Tag className={selectedFlow[1]}>{selectedFlow[0]}</Tag> : null}
                                                <Tag className="border-white/5 bg-zinc-900/40 backdrop-blur-md text-zinc-300">
                                                    {selectedState?.blocked_by_open_count || 0} blockers
                                                </Tag>
                                            </div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-1">Next Step</div>
                                            <p className="text-sm leading-6 text-zinc-300">{nextStep(selectedMemory)}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 text-zinc-100 flex-1 h-[450px]">
                                        <TaskHistoryPanel taskId={selectedTask.id!} />
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <EmptyState message="Select a task from a lane to inspect and edit it." />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
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
