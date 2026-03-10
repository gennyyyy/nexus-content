export const API_BASE = "http://127.0.0.1:8000/api";

export interface Task {
    id?: number;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    priority?: "low" | "medium" | "high" | "critical";
    labels?: string;
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

export async function fetchTasks(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export async function createTask(task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });
    return res.json();
}

export async function updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });
    return res.json();
}

export async function fetchDependencies(): Promise<TaskDependency[]> {
    const res = await fetch(`${API_BASE}/dependencies`);
    if (!res.ok) throw new Error("Failed to fetch dependencies");
    return res.json();
}

export async function deleteTask(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete task");
}

export async function createDependency(dependency: TaskDependency): Promise<TaskDependency> {
    const res = await fetch(`${API_BASE}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dependency),
    });
    if (!res.ok) throw new Error("Failed to create dependency");
    return res.json();
}

export async function deleteDependency(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/dependencies/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete dependency");
}

export async function fetchTaskContext(taskId: number): Promise<ContextEntry[]> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/context`);
    if (!res.ok) throw new Error("Failed to fetch task context");
    return res.json();
}

export async function createTaskContext(taskId: number, entry: Partial<ContextEntry>): Promise<ContextEntry> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("Failed to create task context");
    return res.json();
}

export async function fetchTaskMemory(taskId: number): Promise<TaskMemorySummary> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/memory`);
    if (!res.ok) throw new Error("Failed to fetch task memory");
    return res.json();
}

export async function fetchTaskResumePacket(taskId: number): Promise<ResumePacket> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/resume-packet`);
    if (!res.ok) throw new Error("Failed to fetch task resume packet");
    return res.json();
}

export async function fetchMemoryOverview(): Promise<TaskMemorySummary[]> {
    const res = await fetch(`${API_BASE}/memory`);
    if (!res.ok) throw new Error("Failed to fetch memory overview");
    return res.json();
}

export async function fetchWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
    const res = await fetch(`${API_BASE}/workspace`);
    if (!res.ok) throw new Error("Failed to fetch workspace snapshot");
    return res.json();
}
