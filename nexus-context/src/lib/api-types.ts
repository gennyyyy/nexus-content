export interface Project {
    id: string;
    name: string;
    description?: string;
    owner_user_id?: string;
    archived?: boolean;
    created_at?: string;
}

export interface Task {
    id?: number;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high" | "critical";
    labels?: string;
    project_id?: string | null;
    archived?: boolean;
    created_at?: string;
}

export interface ProjectMembership {
    id?: number;
    project_id: string;
    user_id: string;
    role: string;
    created_at?: string;
}

export interface TaskDependency {
    id?: number;
    source_task_id: number;
    target_task_id: number;
    type: string;
    source_handle?: string | null;
    target_handle?: string | null;
}

export interface ContextEntry {
    id?: number;
    task_id: number;
    content: string;
    entry_type?: string;
    summary?: string;
    what_changed?: string;
    files_touched?: string;
    decisions?: string;
    open_questions?: string;
    next_step?: string;
    actor?: string;
    source?: string;
    timestamp?: string;
}

export interface TaskMemorySummary {
    task_id: number;
    task_title: string;
    task_status: Task["status"];
    latest_summary?: string;
    latest_next_step?: string;
    active_decisions: string[];
    open_questions: string[];
    recent_files: string[];
    recent_entries: ContextEntry[];
}

export interface RelatedTaskSummary {
    task_id: number;
    task_title: string;
    task_status: Task["status"];
    dependency_type: string;
}

export interface TaskOperationalState {
    task_id: number;
    is_ready: boolean;
    is_blocked: boolean;
    blocked_by_open_count: number;
    blocks_open_count: number;
    blocked_by: RelatedTaskSummary[];
    unblocks: RelatedTaskSummary[];
}

export interface WorkspaceSnapshot {
    tasks: Task[];
    dependencies: TaskDependency[];
    memory: TaskMemorySummary[];
    task_states: TaskOperationalState[];
}

export interface ResumePacket {
    task: Task;
    task_state: TaskOperationalState;
    memory: TaskMemorySummary;
    blocked_by: RelatedTaskSummary[];
    unblocks: RelatedTaskSummary[];
    handoff_complete: boolean;
    recommended_next_actions: string[];
    agent_brief: string;
}

export interface ReadyQueueItem {
    task_id: number;
    task_title: string;
    description?: string | null;
    task_status: Task["status"];
    priority: string;
    labels?: string | null;
    latest_summary?: string | null;
    latest_next_step?: string | null;
    blocks_open_count: number;
    recent_files: string[];
    handoff_complete: boolean;
}

export interface AttentionTaskItem {
    task_id: number;
    task_title: string;
    task_status: Task["status"];
    priority: string;
    is_blocked: boolean;
    blocked_by_open_count: number;
    missing_summary: boolean;
    missing_next_step: boolean;
    recent_entries: number;
    latest_summary?: string | null;
    latest_next_step?: string | null;
}

export interface HandoffPulseItem {
    task_id: number;
    task_title: string;
    task_status: Task["status"];
    summary?: string | null;
    next_step?: string | null;
    timestamp?: string | null;
}

export interface MCPServerStatus {
    name: string;
    transport: string;
    status: string;
    sse_url: string;
    post_message_url: string;
}

export interface ControlCenterSnapshot {
    generated_at: string;
    total_tasks: number;
    todo_count: number;
    in_progress_count: number;
    done_count: number;
    ready_count: number;
    blocked_count: number;
    handoff_gap_count: number;
    handoffs_last_7_days: number;
    ready_queue: ReadyQueueItem[];
    attention_tasks: AttentionTaskItem[];
    latest_handoffs: HandoffPulseItem[];
    server: MCPServerStatus;
}

export interface ActivityEvent {
    id: number;
    event_type: string;
    entity_type: string;
    entity_id?: number | null;
    task_id?: number | null;
    task_title?: string | null;
    project_id?: string | null;
    title: string;
    summary: string;
    actor: string;
    source: string;
    created_at: string;
}

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
