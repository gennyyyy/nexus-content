import { useEffect, useMemo, useState } from "react";
import {
    Background,
    BackgroundVariant,
    ConnectionMode,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import type { Connection, Edge, Node, NodeChange } from "@xyflow/react";
import { Brain, Filter, Link2, ListFilter, Plus, Workflow } from "lucide-react";
import "@xyflow/react/dist/style.css";
import {
    createDependency,
    deleteTask,
    createTask,
    deleteDependency,
    fetchDependencies,
    fetchTaskMemory,
    fetchTasks,
    updateTask,
    type Task,
    type TaskDependency,
    type TaskMemorySummary,
} from "../lib/api";
import { GraphTaskNode } from "../components/GraphTaskNode";
import { TaskContextModal } from "../components/TaskContextModal";

const STATUS_META: Record<Task["status"], { label: string; color: string; badge: string }> = {
    todo: { label: "To Do", color: "#f59e0b", badge: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
    in_progress: { label: "In Progress", color: "#3b82f6", badge: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
    done: { label: "Done", color: "#10b981", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
};

const DEPENDENCY_TYPES = ["blocks", "relates_to", "requires", "unlocks"] as const;
const NODE_POSITIONS_KEY = "nexus-workspace-node-positions";
const nodeTypes = { taskCard: GraphTaskNode };

function buildNodes(
    tasks: Task[],
    memoryByTask: Map<number, TaskMemorySummary>,
    positions: Record<string, { x: number; y: number }>,
): Node[] {
    return tasks.map((task, index) => {
        const memory = task.id ? memoryByTask.get(task.id) : undefined;
        const status = STATUS_META[task.status];
        const fallbackPosition = { x: (index % 3) * 340 + 40, y: Math.floor(index / 3) * 220 + 40 };
        return {
            id: String(task.id),
            type: "taskCard",
            position: positions[String(task.id)] ?? fallbackPosition,
            data: {
                title: task.title,
                taskId: task.id,
                statusLabel: status.label,
                summary: memory?.latest_summary || task.description || "No memory handoff yet.",
                nextStep: memory?.latest_next_step || "Not captured",
                badgeClass: status.badge,
            },
        };
    });
}

function buildEdges(dependencies: TaskDependency[]): Edge[] {
    return dependencies.map((dependency) => ({
        id: `e${dependency.source_task_id}-${dependency.target_task_id}-${dependency.type}`,
        source: String(dependency.source_task_id),
        target: String(dependency.target_task_id),
        type: "step",
        label: dependency.type,
        labelStyle: { fill: "#cbd5e1", fontWeight: 700 },
        labelBgStyle: { fill: "#09090b", fillOpacity: 1 },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 9999,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#7dd3fc" },
        style: { stroke: "#7dd3fc", strokeWidth: 2.25 },
    }));
}

function computeAutoLayout(tasks: Task[], dependencies: TaskDependency[]): Record<string, { x: number; y: number }> {
    const ids = tasks.map((task) => task.id).filter((id): id is number => id !== undefined);
    const indegree = new Map<number, number>(ids.map((id) => [id, 0]));
    const outgoing = new Map<number, number[]>();

    for (const dependency of dependencies) {
        outgoing.set(
            dependency.source_task_id,
            [...(outgoing.get(dependency.source_task_id) || []), dependency.target_task_id],
        );
        indegree.set(dependency.target_task_id, (indegree.get(dependency.target_task_id) || 0) + 1);
    }

    const queue = ids.filter((id) => (indegree.get(id) || 0) === 0);
    const depth = new Map<number, number>(ids.map((id) => [id, 0]));

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const next of outgoing.get(current) || []) {
            depth.set(next, Math.max(depth.get(next) || 0, (depth.get(current) || 0) + 1));
            indegree.set(next, (indegree.get(next) || 0) - 1);
            if ((indegree.get(next) || 0) === 0) {
                queue.push(next);
            }
        }
    }

    const columns = new Map<number, Task[]>();
    for (const task of tasks) {
        const level = depth.get(task.id || 0) || 0;
        columns.set(level, [...(columns.get(level) || []), task]);
    }

    const positions: Record<string, { x: number; y: number }> = {};
    const sortedLevels = [...columns.keys()].sort((a, b) => a - b);
    sortedLevels.forEach((level) => {
        const columnTasks = (columns.get(level) || []).sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const ap = priorityOrder[(a.priority || "medium") as keyof typeof priorityOrder] ?? 2;
            const bp = priorityOrder[(b.priority || "medium") as keyof typeof priorityOrder] ?? 2;
            return ap - bp || a.title.localeCompare(b.title);
        });
        columnTasks.forEach((task, row) => {
            positions[String(task.id)] = { x: level * 360 + 48, y: row * 220 + 48 };
        });
    });

    return positions;
}

export function Workspace() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
    const [memoryByTask, setMemoryByTask] = useState<Map<number, TaskMemorySummary>>(new Map());
    const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
        if (typeof window === "undefined") return {};
        try {
            return JSON.parse(window.localStorage.getItem(NODE_POSITIONS_KEY) || "{}") as Record<string, { x: number; y: number }>;
        } catch {
            return {};
        }
    });
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingEdge, setSavingEdge] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [inspectorDraft, setInspectorDraft] = useState({
        title: "",
        description: "",
        priority: "medium",
        labels: "",
    });
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
    const [hideDone, setHideDone] = useState(false);
    const [dependencyType, setDependencyType] = useState<(typeof DEPENDENCY_TYPES)[number]>("blocks");

    useEffect(() => {
        void loadWorkspace();
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(NODE_POSITIONS_KEY, JSON.stringify(nodePositions));
        }
    }, [nodePositions]);

    useEffect(() => {
        setInspectorDraft({
            title: selectedTask?.title || "",
            description: selectedTask?.description || "",
            priority: selectedTask?.priority || "medium",
            labels: selectedTask?.labels || "",
        });
    }, [selectedTask]);

    async function loadWorkspace(selectedId?: number) {
        setLoading(true);
        try {
            const [tasksData, dependenciesData] = await Promise.all([
                fetchTasks(),
                fetchDependencies(),
            ]);

            const memories = await Promise.all(
                tasksData
                    .filter((task) => task.id !== undefined)
                    .map(async (task) => [task.id!, await fetchTaskMemory(task.id!)] as const),
            );

            const memoryMap = new Map<number, TaskMemorySummary>(memories);
            setTasks(tasksData);
            setDependencies(dependenciesData);
            setMemoryByTask(memoryMap);
            setNodes(buildNodes(tasksData, memoryMap, nodePositions));
            setEdges(buildEdges(dependenciesData));

            const activeTask = selectedId
                ? tasksData.find((task) => task.id === selectedId) ?? null
                : selectedTask
                    ? tasksData.find((task) => task.id === selectedTask.id) ?? null
                    : null;
            setSelectedTask(activeTask);
            setSelectedEdgeId(null);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    function handleGraphNodesChange(changes: NodeChange<Node>[]) {
        onNodesChange(changes);
        setNodePositions((current) => {
            const next = { ...current };
            for (const change of changes) {
                if (change.type === "position" && change.position) {
                    next[change.id] = change.position;
                }
            }
            return next;
        });
    }

    async function handleCreateTask(e: React.FormEvent) {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            const created = await createTask({
                title: newTaskTitle.trim(),
                status: "todo",
                description: "New task created from the unified workspace.",
            });
            setNewTaskTitle("");
            await loadWorkspace(created.id);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleStatusChange(status: Task["status"]) {
        if (!selectedTask?.id) return;
        try {
            await updateTask(selectedTask.id, { status });
            await loadWorkspace(selectedTask.id);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSaveTaskDetails() {
        if (!selectedTask?.id || !inspectorDraft.title.trim()) return;
        try {
            await updateTask(selectedTask.id, {
                title: inspectorDraft.title.trim(),
                description: inspectorDraft.description.trim(),
                priority: inspectorDraft.priority as Task["priority"],
                labels: inspectorDraft.labels.trim(),
            });
            await loadWorkspace(selectedTask.id);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleDeleteSelectedEdge() {
        if (!selectedEdgeId) return;
        const edge = edges.find((item) => item.id === selectedEdgeId);
        if (!edge) return;
        const dependencyId = edge.id.match(/^e(\d+)-(\d+)-(.+)$/)
            ? dependenciesFromEdges(edges).find((item) => `e${item.source_task_id}-${item.target_task_id}-${item.type}` === edge.id)?.id
            : undefined;
        if (!dependencyId) return;

        try {
            await deleteDependency(dependencyId);
            setEdges((current) => current.filter((item) => item.id !== selectedEdgeId));
            setSelectedEdgeId(null);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleDeleteSelectedTask() {
        if (!selectedTask?.id) return;
        try {
            await deleteTask(selectedTask.id);
            setNodePositions((current) => {
                const next = { ...current };
                delete next[String(selectedTask.id)];
                return next;
            });
            setSelectedTask(null);
            setSelectedEdgeId(null);
            await loadWorkspace();
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSeedAntiGravity() {
        try {
            const createdTasks = await Promise.all([
                createTask({ title: "Anti Gravity Vision", description: "Define the high-level concept and target outcome.", status: "todo", priority: "high", labels: "anti-gravity,vision" }),
                createTask({ title: "Research Physics Model", description: "Evaluate simulation assumptions, forces, and constraints.", status: "todo", priority: "critical", labels: "anti-gravity,research" }),
                createTask({ title: "Design System Architecture", description: "Plan backend, memory, and graph workflows for the project.", status: "todo", priority: "high", labels: "anti-gravity,architecture" }),
                createTask({ title: "Build Prototype Controls", description: "Create a testable UI and control panel for experimentation.", status: "todo", priority: "medium", labels: "anti-gravity,frontend" }),
                createTask({ title: "Agent Execution Plan", description: "Document how agents should explore, test, and hand off progress.", status: "todo", priority: "high", labels: "anti-gravity,agents" }),
            ]);

            const byTitle = new Map(createdTasks.map((task) => [task.title, task]));
            const dependencySpecs = [
                ["Research Physics Model", "Anti Gravity Vision", "requires"],
                ["Design System Architecture", "Research Physics Model", "blocks"],
                ["Build Prototype Controls", "Design System Architecture", "requires"],
                ["Agent Execution Plan", "Design System Architecture", "relates_to"],
            ] as const;

            await Promise.all(
                dependencySpecs.map(([source, target, type]) =>
                    createDependency({
                        source_task_id: byTitle.get(source)?.id || 0,
                        target_task_id: byTitle.get(target)?.id || 0,
                        type,
                    }),
                ),
            );

            await loadWorkspace(createdTasks[0]?.id);
        } catch (error) {
            console.error(error);
        }
    }

    function dependenciesFromEdges(currentEdges: Edge[]): TaskDependency[] {
        return currentEdges.map((edge) => {
            const matched = edge.id.match(/^e(\d+)-(\d+)-(.+)$/);
            return {
                id: dependencies.find((item) => item.source_task_id === Number(matched?.[1]) && item.target_task_id === Number(matched?.[2]) && item.type === matched?.[3])?.id,
                source_task_id: Number(matched?.[1]),
                target_task_id: Number(matched?.[2]),
                type: matched?.[3] || "blocks",
            };
        });
    }

    function handleAutoArrange() {
        const nextPositions = computeAutoLayout(tasks, dependencies);
        setNodePositions(nextPositions);
        setNodes((current) =>
            current.map((node) => ({
                ...node,
                position: nextPositions[node.id] || node.position,
            })),
        );
    }

    async function handleConnect(connection: Connection) {
        if (!connection.source || !connection.target || savingEdge) return;
        setSavingEdge(true);
        try {
            const created = await createDependency({
                source_task_id: Number(connection.source),
                target_task_id: Number(connection.target),
                type: dependencyType,
            });
            setEdges((current) => {
                const exists = current.some((edge) => edge.id === `e${created.source_task_id}-${created.target_task_id}-${created.type}`);
                if (exists) return current;
                return [
                    ...current,
                    {
                        id: `e${created.source_task_id}-${created.target_task_id}-${created.type}`,
                        source: String(created.source_task_id),
                        target: String(created.target_task_id),
                        type: "step",
                        label: created.type,
                        labelStyle: { fill: "#cbd5e1", fontWeight: 700 },
                        labelBgStyle: { fill: "#09090b", fillOpacity: 1 },
                        labelBgPadding: [8, 4],
                        labelBgBorderRadius: 9999,
                        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#7dd3fc" },
                        style: { stroke: "#7dd3fc", strokeWidth: 2.25 },
                    },
                ];
            });
        } catch (error) {
            console.error(error);
        } finally {
            setSavingEdge(false);
        }
    }

    const visibleTasks = useMemo(() => {
        return tasks.filter((task) => {
            if (hideDone && task.status === "done") return false;
            if (statusFilter !== "all" && task.status !== statusFilter) return false;
            if (!search.trim()) return true;
            const query = search.toLowerCase();
            const memory = task.id ? memoryByTask.get(task.id) : undefined;
            return (
                task.title.toLowerCase().includes(query) ||
                (task.description || "").toLowerCase().includes(query) ||
                (memory?.latest_summary || "").toLowerCase().includes(query)
            );
        });
    }, [hideDone, memoryByTask, search, statusFilter, tasks]);

    const visibleTaskIds = new Set(visibleTasks.map((task) => String(task.id)));
    const visibleNodes = nodes.filter((node) => visibleTaskIds.has(node.id));
    const visibleEdges = edges.filter((edge) => visibleTaskIds.has(edge.source) && visibleTaskIds.has(edge.target));
    const selectedMemory = selectedTask?.id ? memoryByTask.get(selectedTask.id) : undefined;
    const selectedIncoming = selectedTask?.id ? edges.filter((edge) => edge.target === String(selectedTask.id)) : [];
    const selectedOutgoing = selectedTask?.id ? edges.filter((edge) => edge.source === String(selectedTask.id)) : [];

    const summaryCounts = {
        todo: tasks.filter((task) => task.status === "todo").length,
        in_progress: tasks.filter((task) => task.status === "in_progress").length,
        done: tasks.filter((task) => task.status === "done").length,
    };

    return (
        <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]">
            <aside className="border-r border-zinc-800/80 bg-zinc-950/82 p-6 backdrop-blur-xl">
                <div className="mb-6">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300">
                        <Workflow size={14} /> Unified Workspace
                    </div>
                    <h1 className="text-3xl font-bold text-white">Graph-Based Task Management</h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        Manage task status, dependencies, and memory handoffs from one graph. Connect nodes to define blockers.
                    </p>
                </div>

                <form onSubmit={handleCreateTask} className="mb-6 space-y-3 rounded-3xl border border-zinc-800/80 bg-zinc-900/72 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Create Task</div>
                    <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Start with anti gravity..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60"
                    />
                    <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
                        <Plus size={16} /> Add Task
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSeedAntiGravity()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20"
                    >
                        <Workflow size={16} /> Generate Anti Gravity Starter
                    </button>
                    <button
                        type="button"
                        onClick={handleAutoArrange}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                        <Workflow size={16} /> Auto Arrange Graph
                    </button>
                </form>

                <div className="mb-6 space-y-3 rounded-3xl border border-zinc-800/80 bg-zinc-900/72 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        <Filter size={14} /> Workspace Controls
                    </div>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tasks or memory..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as "all" | Task["status"])}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                        >
                            <option value="all">All statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                        <select
                            value={dependencyType}
                            onChange={(e) => setDependencyType(e.target.value as (typeof DEPENDENCY_TYPES)[number])}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                        >
                            {DEPENDENCY_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-300">
                        <span className="inline-flex items-center gap-2">
                            <ListFilter size={14} /> Hide done tasks
                        </span>
                        <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
                    </label>
                </div>

                <div className="mb-6 grid grid-cols-3 gap-3">
                    {(["todo", "in_progress", "done"] as const).map((status) => (
                        <div key={status} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/68 p-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{STATUS_META[status].label}</div>
                            <div className="mt-2 text-2xl font-bold text-white">{summaryCounts[status]}</div>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Tasks</div>
                    <div className="max-h-[calc(100vh-27rem)] space-y-2 overflow-y-auto pr-1">
                        {visibleTasks.map((task) => {
                            const isActive = selectedTask?.id === task.id;
                            const memory = task.id ? memoryByTask.get(task.id) : undefined;
                            return (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => setSelectedTask(task)}
                                    className={`w-full rounded-3xl border p-4 text-left transition ${
                                        isActive
                                            ? "border-sky-400/55 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                                            : "border-zinc-800/80 bg-zinc-900/54 hover:border-zinc-700 hover:bg-zinc-900/80"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-sm font-semibold text-zinc-100">{task.title}</div>
                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${STATUS_META[task.status].badge}`}>
                                            {STATUS_META[task.status].label}
                                        </span>
                                    </div>
                                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                    {memory?.latest_summary || task.description || "No handoff yet."}
                                </p>
                            </button>
                        );
                    })}
                        {visibleTasks.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
                                No tasks match the current filters.
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <section className="relative flex h-full flex-col">
                <div className="grid grid-cols-[minmax(0,1fr)_360px] border-b border-zinc-800/80 bg-zinc-950/66 backdrop-blur-xl">
                    <div className="border-r border-zinc-800/80 p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-100">Task Graph</h2>
                                <p className="mt-1 text-sm text-zinc-400">Drag around, connect nodes, and click a node to open its memory handoff panel.</p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/85 px-3 py-1.5 text-xs text-zinc-300 shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
                                <Link2 size={14} />
                                {savingEdge ? "Saving dependency..." : `Connect from any side to add "${dependencyType}"`}
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        {selectedTask ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Selected Task</div>
                                    <div className="mt-1 text-lg font-semibold text-white">{selectedTask.title}</div>
                                    <p className="mt-2 text-sm text-zinc-400">
                                        {selectedTask.description || "No description captured yet."}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <input
                                        value={inspectorDraft.title}
                                        onChange={(e) => setInspectorDraft((current) => ({ ...current, title: e.target.value }))}
                                        placeholder="Task title"
                                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60"
                                    />
                                    <textarea
                                        value={inspectorDraft.description}
                                        onChange={(e) => setInspectorDraft((current) => ({ ...current, description: e.target.value }))}
                                        placeholder="Task description"
                                        className="min-h-[5.5rem] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <select
                                            value={inspectorDraft.priority}
                                            onChange={(e) => setInspectorDraft((current) => ({ ...current, priority: e.target.value }))}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                        <input
                                            value={inspectorDraft.labels}
                                            onChange={(e) => setInspectorDraft((current) => ({ ...current, labels: e.target.value }))}
                                            placeholder="labels,comma,separated"
                                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveTaskDetails()}
                                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600"
                                    >
                                        Save Task Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteSelectedTask()}
                                        className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                                    >
                                        Delete Task
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(["todo", "in_progress", "done"] as const).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => void handleStatusChange(status)}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                                selectedTask.status === status
                                                    ? STATUS_META[status].badge
                                                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                                            }`}
                                        >
                                            {STATUS_META[status].label}
                                        </button>
                                    ))}
                                </div>
                                <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/68 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                        <Brain size={14} /> Resume Signal
                                    </div>
                                    <div className="text-sm text-zinc-300">
                                        {selectedMemory?.latest_next_step
                                            ? selectedMemory.latest_next_step
                                            : "Open the task to save a handoff and tell the next agent what happens next."}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/68 p-4">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Incoming</div>
                                        <div className="space-y-2 text-sm text-zinc-300">
                                            {selectedIncoming.length > 0 ? selectedIncoming.map((edge) => (
                                                <div key={edge.id}>
                                                    {tasks.find((task) => String(task.id) === edge.source)?.title || edge.source} <span className="text-zinc-500">({edge.label})</span>
                                                </div>
                                            )) : <div className="text-zinc-500">No incoming links</div>}
                                        </div>
                                    </div>
                                    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/68 p-4">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Outgoing</div>
                                        <div className="space-y-2 text-sm text-zinc-300">
                                            {selectedOutgoing.length > 0 ? selectedOutgoing.map((edge) => (
                                                <div key={edge.id}>
                                                    {tasks.find((task) => String(task.id) === edge.target)?.title || edge.target} <span className="text-zinc-500">({edge.label})</span>
                                                </div>
                                            )) : <div className="text-zinc-500">No outgoing links</div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/68 p-4">
                                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Recent Files</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMemory?.recent_files?.length ? selectedMemory.recent_files.map((file) => (
                                            <span key={file} className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300">
                                                {file}
                                            </span>
                                        )) : <span className="text-sm text-zinc-500">No files captured yet</span>}
                                    </div>
                                </div>
                                {selectedTask.labels && (
                                    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/68 p-4">
                                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Labels</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTask.labels.split(",").map((label) => (
                                                <span key={label.trim()} className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300">
                                                    {label.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/68 p-4">
                                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Selected Link</div>
                                    {selectedEdgeId ? (
                                        <div className="space-y-3">
                                            <div className="text-sm text-zinc-300">{selectedEdgeId}</div>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteSelectedEdge()}
                                                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                                            >
                                                Delete Link
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-zinc-500">Click a graph edge to manage it.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/45 p-5 text-sm text-zinc-500">
                                Select a task on the graph or in the list to inspect it.
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative min-h-0 flex-1">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-zinc-500">Loading workspace...</div>
                    ) : (
                        <ReactFlow
                            nodes={visibleNodes}
                            edges={visibleEdges}
                            onNodesChange={handleGraphNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={(connection) => void handleConnect(connection)}
                            connectionMode={ConnectionMode.Strict}
                            fitView
                            colorMode="dark"
                            nodeTypes={nodeTypes}
                            onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
                            onNodeClick={(_, node) => {
                                setSelectedEdgeId(null);
                                const task = tasks.find((item) => String(item.id) === node.id);
                                if (task) setSelectedTask(task);
                            }}
                        >
                            <Controls className="bg-zinc-900 border-zinc-800 fill-white" />
                            <MiniMap
                                nodeColor={(node) => {
                                    const task = tasks.find((item) => String(item.id) === node.id);
                                    return task ? STATUS_META[task.status].color : "#27272a";
                                }}
                                maskColor="rgba(0, 0, 0, 0.72)"
                                className="bg-zinc-950 border border-zinc-800 rounded-xl"
                            />
                            <Background variant={BackgroundVariant.Cross} gap={28} size={1.2} color="#1f2937" />
                        </ReactFlow>
                    )}
                </div>
            </section>

            <TaskContextModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </div>
    );
}
