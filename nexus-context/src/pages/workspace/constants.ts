import type { Task } from "../../lib/api";
import { GraphTaskNode } from "../../components/GraphTaskNode";

export const STATUS_META: Record<Task["status"], { label: string; color: string; badge: string; border: string }> = {
    todo: {
        label: "To Do",
        color: "#f59e0b",
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
        border: "border-amber-500/18",
    },
    in_progress: {
        label: "In Progress",
        color: "#3b82f6",
        badge: "border-blue-500/30 bg-blue-500/10 text-blue-200",
        border: "border-blue-500/18",
    },
    done: {
        label: "Done",
        color: "#10b981",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        border: "border-emerald-500/18",
    },
};

export const PRIORITY_BADGES = {
    low: "border-zinc-700 bg-zinc-900 text-zinc-300",
    medium: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    high: "border-orange-500/25 bg-orange-500/10 text-orange-200",
    critical: "border-rose-500/25 bg-rose-500/10 text-rose-200",
} as const;

export const FLOW_BADGES = {
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    blocked: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    active: "border-blue-500/30 bg-blue-500/10 text-blue-200",
} as const;

export const BOARD_COLUMNS = [
    { id: "todo", title: "To Do", description: "Plan upcoming work." },
    { id: "in_progress", title: "In Progress", description: "Keep active execution visible." },
    { id: "done", title: "Done", description: "Review shipped work and handoffs." },
] as const;

export const DEPENDENCY_TYPES = ["blocks", "relates_to", "requires", "unlocks"] as const;
export const WORKSPACE_MODE_KEY = "nexus-workspace-mode";
export const NODE_POSITIONS_KEY = "nexus-workspace-node-positions";
export const nodeTypes = { taskCard: GraphTaskNode };

export type DependencyType = (typeof DEPENDENCY_TYPES)[number];
