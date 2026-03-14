import { useMemo, useState } from "react";
import type { Task, TaskMemorySummary, TaskOperationalState } from "../../../lib/api";
import { sortTasks } from "../utils";
import type { TaskBuckets, WorkspaceCounts } from "../types";
import type { Node, Edge } from "@xyflow/react";

export function useWorkspaceFilters(
    tasks: Task[],
    memoryByTask: Map<number, TaskMemorySummary>,
    operationalByTask: Map<number, TaskOperationalState>,
    nodes: Node[],
    edges: Edge[]
) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
    const [operationalFilter, setOperationalFilter] = useState<"all" | "ready" | "blocked" | "active">("all");
    const [hideDone, setHideDone] = useState(false);

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
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        operationalFilter,
        setOperationalFilter,
        hideDone,
        setHideDone,
        visibleTasks,
        tasksByStatus,
        visibleNodes,
        visibleEdges,
        readyTasks,
        counts,
    };
}
