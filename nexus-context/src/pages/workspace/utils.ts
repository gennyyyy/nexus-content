import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { Task, TaskDependency, TaskMemorySummary, TaskOperationalState } from "../../lib/api";
import { DEPENDENCY_META, FLOW_BADGES, PRIORITY_BADGES, STATUS_META } from "./constants";
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
        const operationalState = task.id ? state.get(task.id) : undefined;
        const flow = task.id ? getFlowBadge(task, operationalState) : null;
        const priority = normalizePriority(task.priority);
        const statusMeta = STATUS_META[task.status];

        return {
            id: String(task.id),
            type: "taskCard",
            position: positions[String(task.id)] ?? {
                x: (index % 4) * 304 + 48,
                y: Math.floor(index / 4) * 212 + 48,
            },
            data: {
                title: task.title,
                taskId: task.id,
                statusLabel: statusMeta.label,
                statusColor: statusMeta.color,
                summary: taskSummary(task, task.id ? memory.get(task.id) : undefined),
                nextStep: nextStep(task.id ? memory.get(task.id) : undefined),
                badgeClass: statusMeta.badge,
                operationalLabel: flow?.[0],
                operationalClass: flow?.[1],
                priorityLabel: priority.charAt(0).toUpperCase() + priority.slice(1),
                priorityClass: PRIORITY_BADGES[priority],
                blockerCount: operationalState?.blocked_by_open_count || 0,
                downstreamCount: operationalState?.blocks_open_count || 0,
                isHot: priority === "critical" || (operationalState?.blocked_by_open_count || 0) >= 2,
            },
        };
    });
}

export function buildEdges(dependencies: TaskDependency[]): Edge[] {
    return dependencies.map((dependency) => {
        const meta = DEPENDENCY_META[dependency.type as keyof typeof DEPENDENCY_META] ?? {
            stroke: "#8dd3ff",
            badge: "border-sky-500/30 bg-sky-500/10 text-sky-200",
            labelBg: "#082f49",
            labelText: "#dbeafe",
            animated: false,
            dashed: false,
        };

        return {
            id: edgeId(dependency),
            source: String(dependency.source_task_id),
            target: String(dependency.target_task_id),
            sourceHandle: dependency.source_handle ?? undefined,
            targetHandle: dependency.target_handle ?? undefined,
            type: "smoothstep",
            label: dependency.type,
            labelStyle: { fill: meta.labelText, fontWeight: 700, fontSize: 11 },
            labelBgStyle: { fill: meta.labelBg, fillOpacity: 0.96, stroke: meta.stroke, strokeOpacity: 0.18 },
            labelBgPadding: [10, 5],
            labelBgBorderRadius: 999,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: meta.stroke },
            style: {
                stroke: meta.stroke,
                strokeWidth: dependency.type === "relates_to" ? 1.9 : 2.4,
                strokeDasharray: meta.dashed ? "6 5" : undefined,
            },
            animated: meta.animated,
            interactionWidth: 32,
        };
    });
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
                positions[String(task.id)] = { x: level * 304 + 48, y: row * 212 + 48 };
            });
        });

    return positions;
}
