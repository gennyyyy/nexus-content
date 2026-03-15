import type { components } from "./generated-api";

type Schemas = components["schemas"];

export type Project = Schemas["Project"];
export type Task = Schemas["Task"];
export type ProjectMembership = Schemas["ProjectMembership"];
export type TaskDependency = Schemas["TaskDependency"];
export type ContextEntry = Schemas["ContextEntry"];
export type TaskMemorySummary = Schemas["TaskMemorySummary"];
export type RelatedTaskSummary = Schemas["RelatedTaskSummary"];
export type TaskOperationalState = Schemas["TaskOperationalState"];
export type WorkspaceSnapshot = Schemas["WorkspaceSnapshot"];
export type ResumePacket = Schemas["ResumePacket"];
export type ReadyQueueItem = Schemas["ReadyQueueItem"];
export type AttentionTaskItem = Schemas["AttentionTaskItem"];
export type HandoffPulseItem = Schemas["HandoffPulseItem"];
export type MCPServerStatus = Schemas["MCPServerStatus"];
export type ControlCenterSnapshot = Schemas["ControlCenterSnapshot"];
export type ActivityEvent = Schemas["ActivityEvent"];

export interface OperatorMetrics {
    status: string;
    environment: string;
    request_id: string;
    project_id?: string | null;
    task_count: number;
    dependency_count: number;
    context_entry_count: number;
    ready_task_count: number;
    blocked_task_count: number;
    in_progress_task_count: number;
    todo_task_count: number;
    done_task_count: number;
    request_totals: {
        total: number;
        failed: number;
        last_request_id: string;
        last_request_path: string;
        last_status_code: number;
        average_duration_ms: number;
        max_duration_ms: number;
    };
    recent_requests: Array<{
        request_id: string;
        path: string;
        status_code: number;
        duration_ms: number;
        failed: boolean;
    }>;
    path_aggregates: Array<{
        path: string;
        total_requests: number;
        failed_requests: number;
        average_duration_ms: number;
        max_duration_ms: number;
    }>;
    latency_trend: Array<{
        label: string;
        request_count: number;
        failed_count: number;
        average_duration_ms: number;
    }>;
    telemetry_window: {
        recent_request_limit: number;
        path_aggregate_limit: number;
    };
}

export type ProjectExportBundle = Schemas["ProjectExportBundle-Output"];
export type ProjectImportRequest = Schemas["ProjectImportRequest"];
export type ProjectImportResult = Schemas["ProjectImportResult"];
export type ProjectBackupResult = Schemas["ProjectBackupResult"];
export type LiveUpdateEvent = Schemas["LiveUpdateEvent"];
