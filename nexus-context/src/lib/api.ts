export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function handleResponse(res: Response, defaultMessage: string) {
    if (!res.ok) {
        let errorMessage = defaultMessage;
        try {
            const errData = await res.json();
            errorMessage = errData.detail || errData.message || defaultMessage;
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }
    // Return void for 204 No Content
    if (res.status === 204) return undefined;
    return res.json();
}

export interface Project {
    id: string;
    name: string;
    description?: string;
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
    title: string;
    summary: string;
    actor: string;
    source: string;
    created_at: string;
}

export async function fetchTasks(projectId?: string | null): Promise<Task[]> {
    const url = projectId ? `${API_BASE}/tasks?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    return handleResponse(res, "Failed to fetch tasks");
}

export async function createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });
    return handleResponse(res, "Request failed");
}

export async function updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });
    return handleResponse(res, "Request failed");
}

export async function fetchDependencies(): Promise<TaskDependency[]> {
    const res = await fetch(`${API_BASE}/dependencies`);
    return handleResponse(res, "Failed to fetch dependencies");
}

export async function deleteTask(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
    });
    return handleResponse(res, "Failed to delete task");
}

export async function createDependency(dependency: TaskDependency): Promise<TaskDependency> {
    const res = await fetch(`${API_BASE}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dependency),
    });
    return handleResponse(res, "Failed to create dependency");
}

export async function deleteDependency(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/dependencies/${id}`, {
        method: "DELETE",
    });
    return handleResponse(res, "Failed to delete dependency");
}

export async function fetchTaskContext(taskId: number): Promise<ContextEntry[]> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/context`);
    return handleResponse(res, "Failed to fetch task context");
}

export async function createTaskContext(taskId: number, entry: Partial<ContextEntry>): Promise<ContextEntry> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
    });
    return handleResponse(res, "Failed to create task context");
}

export async function fetchTaskMemory(taskId: number): Promise<TaskMemorySummary> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/memory`);
    return handleResponse(res, "Failed to fetch task memory");
}

export async function fetchTaskResumePacket(taskId: number): Promise<ResumePacket> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/resume-packet`);
    return handleResponse(res, "Failed to fetch task resume packet");
}

export async function fetchProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    return handleResponse(res, "Failed to fetch projects");
}

export async function createProject(project: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
    });
    return handleResponse(res, "Failed to create project");
}

export async function fetchProject(projectId: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`);
    return handleResponse(res, "Failed to fetch project");
}

export async function fetchMemoryOverview(projectId?: string | null): Promise<TaskMemorySummary[]> {
    const url = projectId ? `${API_BASE}/memory?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/memory`;
    const res = await fetch(url);
    return handleResponse(res, "Failed to fetch memory overview");
}

export async function fetchWorkspaceSnapshot(projectId?: string | null): Promise<WorkspaceSnapshot> {
    const url = projectId ? `${API_BASE}/workspace?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/workspace`;
    const res = await fetch(url);
    return handleResponse(res, "Failed to fetch workspace snapshot");
}

export async function fetchControlCenterSnapshot(projectId?: string | null): Promise<ControlCenterSnapshot> {
    const url = projectId ? `${API_BASE}/control-center?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/control-center`;
    const res = await fetch(url);
    return handleResponse(res, "Failed to fetch control center snapshot");
}

export async function fetchActivityFeed(limit = 60, projectId?: string | null): Promise<ActivityEvent[]> {
    const url = projectId 
        ? `${API_BASE}/activity?limit=${limit}&project_id=${encodeURIComponent(projectId)}` 
        : `${API_BASE}/activity?limit=${limit}`;
    const res = await fetch(url);
    return handleResponse(res, "Failed to fetch activity feed");
}

export async function fetchTaskActivity(taskId: number): Promise<ActivityEvent[]> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/activity`);
    return handleResponse(res, "Failed to fetch task activity");
}
