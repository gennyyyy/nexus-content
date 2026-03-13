export type TaskStatus = "todo" | "in_progress" | "done";

export interface ProjectModel {
    id: string;
    name: string;
    description?: string | null;
    created_at?: string;
}

export interface TaskModel {
    id: number;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: string;
    labels?: string | null;
    project_id?: string | null;
    created_at?: string;
}

export interface RelatedTaskSummary {
    task_id: number;
    task_title: string;
    task_status: TaskStatus;
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

export interface ContextEntryModel {
    id: number;
    task_id: number;
    content: string;
    entry_type: string;
    summary?: string | null;
    what_changed?: string | null;
    files_touched?: string | null;
    decisions?: string | null;
    open_questions?: string | null;
    next_step?: string | null;
    timestamp: string;
}

export interface TaskMemorySummary {
    task_id: number;
    task_title: string;
    task_status: TaskStatus;
    latest_summary?: string | null;
    latest_next_step?: string | null;
    active_decisions: string[];
    open_questions: string[];
    recent_files: string[];
    recent_entries: ContextEntryModel[];
}

export interface ReadyQueueItem {
    task_id: number;
    task_title: string;
    description?: string | null;
    task_status: TaskStatus;
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
    task_status: TaskStatus;
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
    task_status: TaskStatus;
    summary?: string | null;
    next_step?: string | null;
    timestamp?: string | null;
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
}

export interface ActivityEventModel {
    id: number;
    event_type: string;
    entity_type: string;
    entity_id?: number | null;
    task_id?: number | null;
    task_title?: string | null;
    title: string;
    summary: string;
    actor: string;
    source: string;
    project_id?: string | null;
    created_at: string;
}

export interface ResumePacket {
    task: TaskModel;
    task_state: TaskOperationalState;
    memory: TaskMemorySummary;
    blocked_by: RelatedTaskSummary[];
    unblocks: RelatedTaskSummary[];
    handoff_complete: boolean;
    recommended_next_actions: string[];
    agent_brief: string;
}

export interface ProjectContextBundle {
    project: ProjectModel;
    tasks: TaskModel[];
    controlCenter: ControlCenterSnapshot;
    memory: TaskMemorySummary[];
    activity: ActivityEventModel[];
    generatedAt: string;
}
