import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import type { Connection } from "@xyflow/react";
import type { Task } from "../../lib/api";
import {
    DEPENDENCY_TYPES,
    WORKSPACE_MODE_KEY,
    type DependencyType,
} from "./constants";
import { edgeId, getFlowBadge, normalizePriority } from "./utils";
import type { WorkspaceMode } from "./types";
import { useToast } from "../../components/ToastProvider";
import { useParams, useSearchParams } from "react-router-dom";

import {
    useWorkspaceSnapshot,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
    useCreateDependency,
    useDeleteDependency,
} from "./hooks/useWorkspaceQueries";
import { useWorkspaceGraph } from "./hooks/useWorkspaceGraph";
import { useWorkspaceFilters } from "./hooks/useWorkspaceFilters";

interface InspectorDraft {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    labels: string;
}

const DEFAULT_INSPECTOR_DRAFT: InspectorDraft = {
    title: "",
    description: "",
    priority: "medium",
    labels: "",
};

export function useWorkspaceController() {
    const { toast } = useToast();
    const { projectId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // Data Fetching via React Query
    const { data: snapshot, isLoading: loading } = useWorkspaceSnapshot(projectId);
    
    // Mutations
    const createTaskMutation = useCreateTask(projectId);
    const updateTaskMutation = useUpdateTask(projectId);
    const deleteTaskMutation = useDeleteTask(projectId);
    const createDependencyMutation = useCreateDependency(projectId);
    const deleteDependencyMutation = useDeleteDependency(projectId);

    // Derived Data Lookups
    const tasks = useMemo(() => snapshot?.tasks || [], [snapshot]);
    const dependencies = useMemo(() => snapshot?.dependencies || [], [snapshot]);
    const memoryByTask = useMemo(() => new Map((snapshot?.memory || []).map((item) => [item.task_id, item] as const)), [snapshot]);
    const operationalByTask = useMemo(() => new Map((snapshot?.task_states || []).map((item) => [item.task_id, item] as const)), [snapshot]);

    // Graph State
    const graph = useWorkspaceGraph();
    const { nodes, edges, setNodes, handleAutoArrange: autoArrangeGraph, syncGraph, onNodesChange } = graph;

    // Filter State
    const filters = useWorkspaceFilters(tasks, memoryByTask, operationalByTask, nodes, edges);

    // Workspace mode & ui state
    const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
        if (typeof window === "undefined") return "easy";
        return window.localStorage.getItem(WORKSPACE_MODE_KEY) === "advanced" ? "advanced" : "easy";
    });
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [contextTaskId, setContextTaskId] = useState<number | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [dependencyType, setDependencyType] = useState<DependencyType>(DEPENDENCY_TYPES[0]);
    const [inspectorDraft, setInspectorDraft] = useState<InspectorDraft>(DEFAULT_INSPECTOR_DRAFT);

    // Sync localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem(WORKSPACE_MODE_KEY, workspaceMode);
        }
    }, [workspaceMode]);

    // Handle URL jumping
    useEffect(() => {
        const urlTaskId = searchParams.get("taskId");
        if (urlTaskId && snapshot) {
            const id = Number(urlTaskId);
            if (snapshot.tasks.some(t => t.id === id)) {
                setSelectedTaskId(id);
                setSearchParams((prev) => { prev.delete("taskId"); return prev; }, { replace: true });
            }
        }
    }, [searchParams, setSearchParams, snapshot]);

    // Sync Graph to fresh data
    useEffect(() => {
        if (snapshot) {
            syncGraph(snapshot.tasks, snapshot.dependencies, memoryByTask, operationalByTask);
            // Verify selectedEdgeId still exists
            if (selectedEdgeId && !snapshot.dependencies.some(d => edgeId(d) === selectedEdgeId)) {
                setSelectedEdgeId(null);
            }
        }
    }, [snapshot, memoryByTask, operationalByTask, syncGraph, selectedEdgeId]);

    // Selectors
    const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
    const contextTask = useMemo(() => tasks.find(t => t.id === contextTaskId) ?? null, [tasks, contextTaskId]);

    // Inspector draft syncing
    useEffect(() => {
        setInspectorDraft({
            title: selectedTask?.title || "",
            description: selectedTask?.description || "",
            priority: selectedTask?.priority || "medium",
            labels: selectedTask?.labels || "",
        });
    }, [selectedTask]);

    // Actions
    const handleCreateTask = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newTaskTitle.trim()) return;

        createTaskMutation.mutate(
            { title: newTaskTitle.trim(), status: "todo", description: "New task created from the workspace.", project_id: projectId },
            {
                onSuccess: (created) => {
                    setNewTaskTitle("");
                    setSelectedTaskId(created.id!);
                    toast(`Task "${created.title}" created`, "success");
                },
                onError: () => toast("Failed to create task", "error")
            }
        );
    }, [newTaskTitle, projectId, createTaskMutation, toast]);

    const handleStatusChange = useCallback((status: Task["status"]) => {
        if (!selectedTask?.id) return;
        const id = selectedTask.id;
        
        // Optimistically update Graph nodes locally to avoid snapback before React Query cache invalidates
        setNodes((current) =>
            current.map((node) => node.id === String(id) ? { ...node, data: { ...node.data, task: { ...(node.data.task as Task), status } } } : node)
        );

        updateTaskMutation.mutate({ id, status }, {
            onError: () => toast("Failed to update status", "error")
        });
    }, [selectedTask, updateTaskMutation, setNodes, toast]);

    const handleSaveTaskDetails = useCallback(() => {
        if (!selectedTask?.id || !inspectorDraft.title.trim()) return;
        
        updateTaskMutation.mutate({
            id: selectedTask.id,
            title: inspectorDraft.title.trim(),
            description: inspectorDraft.description.trim(),
            priority: normalizePriority(inspectorDraft.priority),
            labels: inspectorDraft.labels.trim(),
        }, {
            onSuccess: () => toast("Task details saved", "success"),
            onError: () => toast("Failed to save task details", "error")
        });
    }, [selectedTask, inspectorDraft, updateTaskMutation, toast]);

    const handleDeleteSelectedTask = useCallback(() => {
        if (!selectedTask?.id) return;
        const id = selectedTask.id;

        setSelectedTaskId(null);
        setSelectedEdgeId(null);
        if (contextTaskId === id) setContextTaskId(null);

        deleteTaskMutation.mutate(id, {
            onSuccess: () => {
                graph.setNodePositions((curr: Record<string, { x: number; y: number }>) => { const next = { ...curr }; delete next[String(id)]; return next; });
                toast("Task deleted", "success");
            },
            onError: () => toast("Failed to delete task", "error")
        });
    }, [selectedTask, contextTaskId, deleteTaskMutation, graph, toast]);

    const handleDeleteSelectedEdge = useCallback(() => {
        if (!selectedEdgeId) return;
        const dependency = dependencies.find((item) => edgeId(item) === selectedEdgeId);
        if (!dependency?.id) return;

        deleteDependencyMutation.mutate(dependency.id, {
            onSuccess: () => {
                setSelectedEdgeId(null);
                toast("Dependency removed", "success");
            },
            onError: () => toast("Failed to delete dependency", "error")
        });
    }, [selectedEdgeId, dependencies, deleteDependencyMutation, toast]);

    const handleConnect = useCallback((connection: Connection) => {
        if (!connection.source || !connection.target || createDependencyMutation.isPending) return;

        createDependencyMutation.mutate({
            source_task_id: Number(connection.source),
            target_task_id: Number(connection.target),
            type: dependencyType,
            source_handle: connection.sourceHandle ?? undefined,
            target_handle: connection.targetHandle ?? undefined,
        }, {
            onSuccess: () => toast(`Dependency "${dependencyType}" created`, "success"),
            onError: () => toast("Failed to create dependency", "error")
        });
    }, [createDependencyMutation, dependencyType, toast]);

    const handleBoardDragEnd = useCallback((result: DropResult) => {
        if (!result.destination || result.destination.droppableId === result.source.droppableId) return;

        const id = Number(result.draggableId);
        const status = result.destination.droppableId as Task["status"];

        updateTaskMutation.mutate({ id, status }, {
            onError: () => toast("Failed to move task", "error")
        });
    }, [updateTaskMutation, toast]);

    const selectTask = useCallback((task: Task) => {
        setSelectedTaskId(task.id!);
        setSelectedEdgeId(null);
    }, []);

    const openContextTask = useCallback((task: Task) => {
        setContextTaskId(task.id!);
    }, []);

    const inspectAndOpenTask = useCallback((task: Task) => {
        setSelectedTaskId(task.id!);
        setContextTaskId(task.id!);
        setSelectedEdgeId(null);
    }, []);

    const closeContextTask = useCallback(() => {
        setContextTaskId(null);
    }, []);

    const updateInspectorField = useCallback((field: keyof InspectorDraft, value: string) => {
        setInspectorDraft((current) => ({ ...current, [field]: value }));
    }, []);

    const handleAutoArrange = useCallback(() => {
        autoArrangeGraph(tasks, dependencies);
    }, [autoArrangeGraph, tasks, dependencies]);

    const selectedMemory = selectedTask?.id ? memoryByTask.get(selectedTask.id) : undefined;
    const selectedState = selectedTask?.id ? operationalByTask.get(selectedTask.id) : undefined;
    const selectedFlow = selectedTask ? getFlowBadge(selectedTask, selectedState) : null;
    const selectedDependency = selectedEdgeId ? dependencies.find((dependency) => edgeId(dependency) === selectedEdgeId) : undefined;

    return {
        // Data lookups
        tasks,
        memoryByTask,
        operationalByTask,
        
        // UI State
        workspaceMode,
        setWorkspaceMode,
        loading,
        savingEdge: createDependencyMutation.isPending,
        
        newTaskTitle,
        setNewTaskTitle,
        dependencyType,
        setDependencyType,
        
        // Filters & Derived
        ...filters,

        // Graph State
        ...graph,
        handleGraphNodesChange: onNodesChange,
        handleAutoArrange,
        setSelectedEdgeId,

        // Selection & Inspector
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

        // Actions
        handleCreateTask,
        handleStatusChange,
        handleSaveTaskDetails,
        handleDeleteSelectedTask,
        handleDeleteSelectedEdge,
        handleConnect,
        handleBoardDragEnd,
    };
}
