import type { Task, TaskDependency, TaskMemorySummary, TaskOperationalState } from "../../lib/api";

export type WorkspaceMode = "easy" | "advanced";
export type PositionMap = Record<string, { x: number; y: number }>;
export type FlowBadge = readonly [label: string, className: string] | null;
export type TaskBuckets = Record<Task["status"], Task[]>;

export interface WorkspaceCounts {
    todo: number;
    in_progress: number;
    done: number;
    ready: number;
    blocked: number;
}

export interface InspectorDraft {
    title: string;
    description: string;
    priority: string;
    labels: string;
}

export interface WorkspaceSelection {
    selectedTask: Task | null;
    selectedMemory?: TaskMemorySummary;
    selectedState?: TaskOperationalState;
    selectedFlow: FlowBadge;
    selectedDependency?: TaskDependency;
}
