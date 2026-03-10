import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useEdgesState, useNodesState, type Connection, type Edge, type Node, type NodeChange } from "@xyflow/react";
import type { DropResult } from "@hello-pangea/dnd";
import {
    createDependency,
    createTask,
    deleteDependency,
    deleteTask,
    fetchWorkspaceSnapshot,
    updateTask,
    type Task,
    type TaskDependency,
    type TaskMemorySummary,
    type TaskOperationalState,
} from "../../lib/api";
import {
    DEPENDENCY_TYPES,
    NODE_POSITIONS_KEY,
    WORKSPACE_MODE_KEY,
    type DependencyType,
} from "./constants";
import { buildEdges, buildNodes, computeAutoLayout, edgeId, getFlowBadge, normalizePriority, sortTasks } from "./utils";
import type { InspectorDraft, PositionMap, TaskBuckets, WorkspaceCounts, WorkspaceMode } from "./types";

const DEFAULT_INSPECTOR_DRAFT: InspectorDraft = {
    title: "",
    description: "",
    priority: "medium",
    labels: "",
};

export function useWorkspaceController() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
    const [memoryByTask, setMemoryByTask] = useState<Map<number, TaskMemorySummary>>(new Map());
    const [operationalByTask, setOperationalByTask] = useState<Map<number, TaskOperationalState>>(new Map());
    const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
        if (typeof window === "undefined") return "easy";
        return window.localStorage.getItem(WORKSPACE_MODE_KEY) === "advanced" ? "advanced" : "easy";
    });
    const [nodePositions, setNodePositions] = useState<PositionMap>(() => {
        if (typeof window === "undefined") return {};
        try {
            return JSON.parse(window.localStorage.getItem(NODE_POSITIONS_KEY) || "{}") as PositionMap;
        } catch {
            return {};
        }
    });
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [contextTask, setContextTask] = useState<Task | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingEdge, setSavingEdge] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
    const [operationalFilter, setOperationalFilter] = useState<"all" | "ready" | "blocked" | "active">("all");
    const [hideDone, setHideDone] = useState(false);
    const [dependencyType, setDependencyType] = useState<DependencyType>(DEPENDENCY_TYPES[0]);
    const [inspectorDraft, setInspectorDraft] = useState<InspectorDraft>(DEFAULT_INSPECTOR_DRAFT);

    const nodePositionsRef = useRef(nodePositions);
    const selectedTaskIdRef = useRef<number | undefined>(selectedTask?.id);

    useEffect(() => {
        nodePositionsRef.current = nodePositions;
        if (typeof window !== "undefined") {
            window.localStorage.setItem(NODE_POSITIONS_KEY, JSON.stringify(nodePositions));
        }
    }, [nodePositions]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(WORKSPACE_MODE_KEY, workspaceMode);
        }
    }, [workspaceMode]);

    useEffect(() => {
        selectedTaskIdRef.current = selectedTask?.id;
    }, [selectedTask]);

    useEffect(() => {
        setInspectorDraft({
            title: selectedTask?.title || "",
            description: selectedTask?.description || "",
            priority: selectedTask?.priority || "medium",
            labels: selectedTask?.labels || "",
        });
    }, [selectedTask]);

    const loadWorkspace = useCallback(async (selectedId?: number) => {
        setLoading(true);
        try {
            const snapshot = await fetchWorkspaceSnapshot();
            const nextMemory = new Map(snapshot.memory.map((item) => [item.task_id, item] as const));
            const nextOperational = new Map(snapshot.task_states.map((item) => [item.task_id, item] as const));

            setTasks(snapshot.tasks);
            setDependencies(snapshot.dependencies);
            setMemoryByTask(nextMemory);
            setOperationalByTask(nextOperational);
            setNodes(buildNodes(snapshot.tasks, nextMemory, nextOperational, nodePositionsRef.current));
            setEdges(buildEdges(snapshot.dependencies));

            const activeTaskId = selectedId ?? selectedTaskIdRef.current;
            const nextSelectedTask = activeTaskId
                ? snapshot.tasks.find((task) => task.id === activeTaskId) ?? null
                : null;

            setSelectedTask(nextSelectedTask);
            setSelectedEdgeId((current) =>
                current && snapshot.dependencies.some((dependency) => edgeId(dependency) === current) ? current : null,
            );
            setContextTask((current) => {
                if (!current?.id) return null;
                return snapshot.tasks.find((task) => task.id === current.id) ?? null;
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [setEdges, setNodes]);

    useEffect(() => {
        void loadWorkspace();
    }, [loadWorkspace]);

    const handleGraphNodesChange = useCallback((changes: NodeChange<Node>[]) => {
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
    }, [onNodesChange]);

    const handleCreateTask = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const created = await createTask({
                title: newTaskTitle.trim(),
                status: "todo",
                description: "New task created from the workspace.",
            });
            setNewTaskTitle("");
            await loadWorkspace(created.id);
        } catch (error) {
            console.error(error);
        }
    }, [loadWorkspace, newTaskTitle]);

    const handleStatusChange = useCallback(async (status: Task["status"]) => {
        if (!selectedTask?.id) return;
        try {
            await updateTask(selectedTask.id, { status });
            await loadWorkspace(selectedTask.id);
        } catch (error) {
            console.error(error);
        }
    }, [loadWorkspace, selectedTask]);

    const handleSaveTaskDetails = useCallback(async () => {
        if (!selectedTask?.id || !inspectorDraft.title.trim()) return;

        try {
            await updateTask(selectedTask.id, {
                title: inspectorDraft.title.trim(),
                description: inspectorDraft.description.trim(),
                priority: normalizePriority(inspectorDraft.priority),
                labels: inspectorDraft.labels.trim(),
            });
            await loadWorkspace(selectedTask.id);
        } catch (error) {
            console.error(error);
        }
    }, [inspectorDraft.description, inspectorDraft.labels, inspectorDraft.priority, inspectorDraft.title, loadWorkspace, selectedTask]);

    const handleDeleteSelectedTask = useCallback(async () => {
        if (!selectedTask?.id) return;
        const selectedTaskId = selectedTask.id;

        try {
            await deleteTask(selectedTaskId);
            setSelectedTask(null);
            setSelectedEdgeId(null);
            setNodePositions((current) => {
                const next = { ...current };
                delete next[String(selectedTaskId)];
                return next;
            });
            setContextTask((current) => (current?.id === selectedTaskId ? null : current));
            await loadWorkspace();
        } catch (error) {
            console.error(error);
        }
    }, [loadWorkspace, selectedTask]);

    const handleDeleteSelectedEdge = useCallback(async () => {
        if (!selectedEdgeId) return;
        const dependency = dependencies.find((item) => edgeId(item) === selectedEdgeId);
        if (!dependency?.id) return;

        try {
            await deleteDependency(dependency.id);
            setSelectedEdgeId(null);
            await loadWorkspace(selectedTask?.id);
        } catch (error) {
            console.error(error);
        }
    }, [dependencies, loadWorkspace, selectedEdgeId, selectedTask]);

    const handleConnect = useCallback(async (connection: Connection) => {
        if (!connection.source || !connection.target || savingEdge) return;
        setSavingEdge(true);

        try {
            const created = await createDependency({
                source_task_id: Number(connection.source),
                target_task_id: Number(connection.target),
                type: dependencyType,
                source_handle: connection.sourceHandle ?? undefined,
                target_handle: connection.targetHandle ?? undefined,
            });
            await loadWorkspace(selectedTask?.id ?? created.source_task_id);
        } catch (error) {
            console.error(error);
        } finally {
            setSavingEdge(false);
        }
    }, [dependencyType, loadWorkspace, savingEdge, selectedTask]);

    const handleBoardDragEnd = useCallback(async (result: DropResult) => {
        if (!result.destination || result.destination.droppableId === result.source.droppableId) return;

        const taskId = Number(result.draggableId);
        const nextStatus = result.destination.droppableId as Task["status"];
        setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
        setSelectedTask((current) => (current?.id === taskId ? { ...current, status: nextStatus } : current));

        try {
            await updateTask(taskId, { status: nextStatus });
        } catch (error) {
            console.error(error);
        } finally {
            await loadWorkspace(selectedTaskIdRef.current ?? taskId);
        }
    }, [loadWorkspace]);

    const handleAutoArrange = useCallback(() => {
        const nextPositions = computeAutoLayout(tasks, dependencies);
        setNodePositions(nextPositions);
        setNodes((current) => current.map((node) => ({ ...node, position: nextPositions[node.id] || node.position })));
    }, [dependencies, setNodes, tasks]);

    const selectTask = useCallback((task: Task) => {
        setSelectedTask(task);
        setSelectedEdgeId(null);
    }, []);

    const openContextTask = useCallback((task: Task) => {
        setContextTask(task);
    }, []);

    const inspectAndOpenTask = useCallback((task: Task) => {
        setSelectedTask(task);
        setContextTask(task);
        setSelectedEdgeId(null);
    }, []);

    const closeContextTask = useCallback(() => {
        setContextTask(null);
    }, []);

    const updateInspectorField = useCallback((field: keyof InspectorDraft, value: string) => {
        setInspectorDraft((current) => ({ ...current, [field]: value }));
    }, []);

    const visibleTasks = useMemo(() => {
        const filtered = tasks.filter((task) => {
            const operational = task.id ? operationalByTask.get(task.id) : undefined;
            const memory = task.id ? memoryByTask.get(task.id) : undefined;

            if (hideDone && task.status === "done") return false;
            if (statusFilter !== "all" && task.status !== statusFilter) return false;
            if (operationalFilter === "ready" && !operational?.is_ready) return false;
            if (operationalFilter === "blocked" && !operational?.is_blocked) return false;
            if (operationalFilter === "active" && task.status !== "in_progress") return false;
            if (!search.trim()) return true;

            const query = search.toLowerCase();
            return (
                task.title.toLowerCase().includes(query) ||
                (task.description || "").toLowerCase().includes(query) ||
                (memory?.latest_summary || "").toLowerCase().includes(query) ||
                (memory?.latest_next_step || "").toLowerCase().includes(query)
            );
        });

        return sortTasks(filtered);
    }, [hideDone, memoryByTask, operationalByTask, operationalFilter, search, statusFilter, tasks]);

    const tasksByStatus = useMemo<TaskBuckets>(() => ({
        todo: visibleTasks.filter((task) => task.status === "todo"),
        in_progress: visibleTasks.filter((task) => task.status === "in_progress"),
        done: visibleTasks.filter((task) => task.status === "done"),
    }), [visibleTasks]);

    const visibleIds = useMemo(() => new Set(visibleTasks.map((task) => String(task.id))), [visibleTasks]);
    const visibleNodes = useMemo(() => nodes.filter((node) => visibleIds.has(node.id)), [nodes, visibleIds]);
    const visibleEdges = useMemo(
        () => edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
        [edges, visibleIds],
    );
    const selectedMemory = selectedTask?.id ? memoryByTask.get(selectedTask.id) : undefined;
    const selectedState = selectedTask?.id ? operationalByTask.get(selectedTask.id) : undefined;
    const selectedFlow = selectedTask ? getFlowBadge(selectedTask, selectedState) : null;
    const selectedDependency = selectedEdgeId ? dependencies.find((dependency) => edgeId(dependency) === selectedEdgeId) : undefined;
    const readyTasks = useMemo(
        () => visibleTasks.filter((task) => (task.id ? operationalByTask.get(task.id)?.is_ready : false)).slice(0, 6),
        [operationalByTask, visibleTasks],
    );
    const counts = useMemo<WorkspaceCounts>(() => ({
        todo: tasks.filter((task) => task.status === "todo").length,
        in_progress: tasks.filter((task) => task.status === "in_progress").length,
        done: tasks.filter((task) => task.status === "done").length,
        ready: [...operationalByTask.values()].filter((state) => state.is_ready).length,
        blocked: [...operationalByTask.values()].filter((state) => state.is_blocked).length,
    }), [operationalByTask, tasks]);

    return {
        tasks,
        memoryByTask,
        operationalByTask,
        workspaceMode,
        setWorkspaceMode,
        loading,
        savingEdge,
        newTaskTitle,
        setNewTaskTitle,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        operationalFilter,
        setOperationalFilter,
        hideDone,
        setHideDone,
        dependencyType,
        setDependencyType,
        tasksByStatus,
        visibleTasks,
        visibleNodes,
        visibleEdges,
        readyTasks,
        counts,
        selectedTask,
        contextTask,
        closeContextTask,
        openContextTask,
        inspectAndOpenTask,
        selectTask,
        selectedMemory,
        selectedState,
        selectedFlow,
        selectedDependency,
        inspectorDraft,
        updateInspectorField,
        handleCreateTask,
        handleStatusChange,
        handleSaveTaskDetails,
        handleDeleteSelectedTask,
        handleDeleteSelectedEdge,
        handleConnect,
        handleBoardDragEnd,
        handleGraphNodesChange,
        handleAutoArrange,
        onEdgesChange,
        setSelectedEdgeId,
    };
}
