import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { Task, TaskDependency, TaskMemorySummary, TaskOperationalState } from "../../lib/api";
import { FLOW_BADGES, PRIORITY_BADGES, STATUS_META } from "./constants";
import type { FlowBadge, PositionMap } from "./types";

export function getFlowBadge(task: Task, state?: TaskOperationalState): FlowBadge {
    if (state?.is_blocked) return ["Blocked", FLOW_BADGES.blocked] as const;
    if (state?.is_ready) return ["Ready", FLOW_BADGES.ready] as const;
    if (task.status === "in_progress") return ["Active", FLOW_BADGES.active] as const;
    return null;
}

export function normalizePriority(priority?: string): keyof typeof PRIORITY_BADGES {
    return priority && priority in PRIORITY_BADGES
        ? (priority as keyof typeof PRIORITY_BADGES)
        : "medium";
}

export function taskSummary(task: Task, memory?: TaskMemorySummary) {
    return memory?.latest_summary || task.description || "No handoff captured yet.";
}

export function nextStep(memory?: TaskMemorySummary) {
    return memory?.latest_next_step || "No next step captured yet.";
}

export function edgeId(dependency: Pick<TaskDependency, "source_task_id" | "target_task_id" | "type">) {
    return `e${dependency.source_task_id}-${dependency.target_task_id}-${dependency.type}`;
}

export function sortTasks(tasks: Task[]) {
    const order: Record<keyof typeof PRIORITY_BADGES, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
    };

    return [...tasks].sort(
        (a, b) => order[normalizePriority(a.priority)] - order[normalizePriority(b.priority)] || a.title.localeCompare(b.title),
    );
}

export function buildNodes(
    tasks: Task[],
    memory: Map<number, TaskMemorySummary>,
    state: Map<number, TaskOperationalState>,
    positions: PositionMap,
): Node[] {
    return tasks.map((task, index) => {
        const flow = task.id ? getFlowBadge(task, state.get(task.id)) : null;

        return {
            id: String(task.id),
            type: "taskCard",
            position: positions[String(task.id)] ?? {
                x: (index % 4) * 280 + 48,
                y: Math.floor(index / 4) * 164 + 48,
            },
            data: {
                title: task.title,
                taskId: task.id,
                statusLabel: STATUS_META[task.status].label,
                summary: taskSummary(task, task.id ? memory.get(task.id) : undefined),
                nextStep: nextStep(task.id ? memory.get(task.id) : undefined),
                badgeClass: STATUS_META[task.status].badge,
                operationalLabel: flow?.[0],
                operationalClass: flow?.[1],
            },
        };
    });
}

export function buildEdges(dependencies: TaskDependency[]): Edge[] {
    return dependencies.map((dependency) => ({
        id: edgeId(dependency),
        source: String(dependency.source_task_id),
        target: String(dependency.target_task_id),
        sourceHandle: dependency.source_handle ?? undefined,
        targetHandle: dependency.target_handle ?? undefined,
        type: "step",
        label: dependency.type,
        labelStyle: { fill: "#d4d4d8", fontWeight: 700 },
        labelBgStyle: { fill: "#09090b", fillOpacity: 1 },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#8dd3ff" },
        style: { stroke: "#8dd3ff", strokeWidth: 2.2 },
        interactionWidth: 28,
    }));
}

export function computeAutoLayout(tasks: Task[], dependencies: TaskDependency[]): PositionMap {
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
        const current = queue.shift();
        if (current === undefined) continue;

        for (const next of outgoing.get(current) || []) {
            depth.set(next, Math.max(depth.get(next) || 0, (depth.get(current) || 0) + 1));
            indegree.set(next, (indegree.get(next) || 0) - 1);
            if ((indegree.get(next) || 0) === 0) {
                queue.push(next);
            }
        }
    }

    const positions: PositionMap = {};
    const columns = new Map<number, Task[]>();

    for (const task of tasks) {
        const level = depth.get(task.id || 0) || 0;
        columns.set(level, [...(columns.get(level) || []), task]);
    }

    [...columns.keys()]
        .sort((a, b) => a - b)
        .forEach((level) => {
            sortTasks(columns.get(level) || []).forEach((task, row) => {
                positions[String(task.id)] = { x: level * 280 + 48, y: row * 164 + 48 };
            });
        });

    return positions;
}
