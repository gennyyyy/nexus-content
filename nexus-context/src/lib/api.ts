export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export * from "./api-types";

import {
    DEFAULT_USER_SESSION,
    readStoredUserSession,
} from "./user-session";
import type {
    ActivityEvent,
    ContextEntry,
    ControlCenterSnapshot,
    OperatorMetrics,
    Project,
    ProjectBackupResult,
    ProjectExportBundle,
    ProjectImportRequest,
    ProjectImportResult,
    ProjectMembership,
    ResumePacket,
    Task,
    TaskDependency,
    TaskMemorySummary,
    WorkspaceSnapshot,
} from "./api-types";

function withProjectId(url: string, projectId?: string | null) {
    if (!projectId) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}project_id=${encodeURIComponent(projectId)}`;
}

function withSearch(url: string, search?: string | null) {
    if (!search?.trim()) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}search=${encodeURIComponent(search.trim())}`;
}

function getUserHeaders(): HeadersInit {
    const session = typeof window === "undefined"
        ? DEFAULT_USER_SESSION
        : readStoredUserSession();

    return {
        "X-Nexus-User": session.userId,
        "X-Nexus-Role": session.role,
    };
}

async function apiFetch(
    input: string,
    init: RequestInit = {},
): Promise<Response> {
    const headers = new Headers(init.headers);
    const userHeaders = getUserHeaders();
    Object.entries(userHeaders).forEach(([key, value]) => headers.set(key, value));

    return fetch(input, {
        ...init,
        headers,
    });
}

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


export async function fetchTasks(projectId?: string | null): Promise<Task[]> {
    return fetchTasksWithOptions(projectId);
}

export async function fetchTasksWithOptions(
    projectId?: string | null,
    options?: { includeArchived?: boolean },
): Promise<Task[]> {
    let url = projectId ? `${API_BASE}/tasks?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/tasks`;
    if (options?.includeArchived) {
        url = `${url}${url.includes("?") ? "&" : "?"}include_archived=true`;
    }
    const res = await apiFetch(url);
    return handleResponse(res, "Failed to fetch tasks");
}

export async function createTask(task: Partial<Task>): Promise<Task> {
    const res = await apiFetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });
    return handleResponse(res, "Request failed");
}

export async function updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const res = await apiFetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
    });
    return handleResponse(res, "Request failed");
}

export async function fetchDependencies(projectId?: string | null): Promise<TaskDependency[]> {
    const res = await apiFetch(withProjectId(`${API_BASE}/dependencies`, projectId));
    return handleResponse(res, "Failed to fetch dependencies");
}

export async function deleteTask(id: number): Promise<void> {
    const res = await apiFetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
    });
    return handleResponse(res, "Failed to delete task");
}

export async function createDependency(dependency: TaskDependency): Promise<TaskDependency> {
    const res = await apiFetch(`${API_BASE}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dependency),
    });
    return handleResponse(res, "Failed to create dependency");
}

export async function deleteDependency(id: number): Promise<void> {
    const res = await apiFetch(`${API_BASE}/dependencies/${id}`, {
        method: "DELETE",
    });
    return handleResponse(res, "Failed to delete dependency");
}

export async function fetchTaskContext(taskId: number, projectId?: string | null): Promise<ContextEntry[]> {
    const res = await apiFetch(withProjectId(`${API_BASE}/tasks/${taskId}/context`, projectId));
    return handleResponse(res, "Failed to fetch task context");
}

export async function createTaskContext(taskId: number, entry: Partial<ContextEntry>, projectId?: string | null): Promise<ContextEntry> {
    const res = await apiFetch(withProjectId(`${API_BASE}/tasks/${taskId}/context`, projectId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
    });
    return handleResponse(res, "Failed to create task context");
}

export async function fetchTaskMemory(taskId: number, projectId?: string | null): Promise<TaskMemorySummary> {
    const res = await apiFetch(withProjectId(`${API_BASE}/tasks/${taskId}/memory`, projectId));
    return handleResponse(res, "Failed to fetch task memory");
}

export async function fetchTaskResumePacket(taskId: number, projectId?: string | null): Promise<ResumePacket> {
    const res = await apiFetch(withProjectId(`${API_BASE}/tasks/${taskId}/resume-packet`, projectId));
    return handleResponse(res, "Failed to fetch task resume packet");
}

export async function fetchProjects(): Promise<Project[]> {
    return fetchProjectsWithOptions();
}

export async function fetchProjectsWithOptions(options?: {
    includeArchived?: boolean;
}): Promise<Project[]> {
    const url = options?.includeArchived
        ? `${API_BASE}/projects?include_archived=true`
        : `${API_BASE}/projects`;
    const res = await apiFetch(url);
    return handleResponse(res, "Failed to fetch projects");
}

export async function createProject(project: Partial<Project>): Promise<Project> {
    const res = await apiFetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
    });
    return handleResponse(res, "Failed to create project");
}

export async function fetchProject(projectId: string): Promise<Project> {
    const res = await apiFetch(`${API_BASE}/projects/${projectId}`);
    return handleResponse(res, "Failed to fetch project");
}

export async function exportProject(projectId: string): Promise<ProjectExportBundle> {
    const res = await apiFetch(`${API_BASE}/projects/${projectId}/export`);
    return handleResponse(res, "Failed to export project");
}

export async function importProject(
    payload: ProjectImportRequest,
): Promise<ProjectImportResult> {
    const res = await apiFetch(`${API_BASE}/projects/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return handleResponse(res, "Failed to import project");
}

export async function backupProject(
    projectId: string,
): Promise<ProjectBackupResult> {
    const res = await apiFetch(`${API_BASE}/projects/${projectId}/backup`, {
        method: "POST",
    });
    return handleResponse(res, "Failed to back up project");
}

export async function updateProjectArchiveState(
    projectId: string,
    archived: boolean,
): Promise<Project> {
    const res = await apiFetch(`${API_BASE}/projects/${projectId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
    });
    return handleResponse(res, "Failed to update project archive state");
}

export async function fetchProjectMemberships(
    projectId: string,
): Promise<ProjectMembership[]> {
    const res = await apiFetch(`${API_BASE}/projects/${projectId}/memberships`);
    return handleResponse(res, "Failed to fetch project memberships");
}

export async function upsertProjectMembership(
    projectId: string,
    membership: Pick<ProjectMembership, "user_id" | "role">,
): Promise<ProjectMembership> {
    const res = await apiFetch(`${API_BASE}/projects/${projectId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(membership),
    });
    return handleResponse(res, "Failed to update project membership");
}

export async function deleteProjectMembership(
    projectId: string,
    userId: string,
): Promise<void> {
    const res = await apiFetch(
        `${API_BASE}/projects/${projectId}/memberships/${encodeURIComponent(userId)}`,
        {
            method: "DELETE",
        },
    );
    return handleResponse(res, "Failed to remove project membership");
}

export async function updateTaskArchiveState(
    taskId: number,
    archived: boolean,
): Promise<Task> {
    const res = await apiFetch(`${API_BASE}/tasks/${taskId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
    });
    return handleResponse(res, "Failed to update task archive state");
}

export async function fetchMemoryOverview(
    projectId?: string | null,
    search?: string | null,
): Promise<TaskMemorySummary[]> {
    const baseUrl = projectId ? `${API_BASE}/memory?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/memory`;
    const res = await apiFetch(withSearch(baseUrl, search));
    return handleResponse(res, "Failed to fetch memory overview");
}

export async function fetchWorkspaceSnapshot(projectId?: string | null): Promise<WorkspaceSnapshot> {
    const url = projectId ? `${API_BASE}/workspace?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/workspace`;
    const res = await apiFetch(url);
    return handleResponse(res, "Failed to fetch workspace snapshot");
}

export async function fetchControlCenterSnapshot(projectId?: string | null): Promise<ControlCenterSnapshot> {
    const url = projectId ? `${API_BASE}/control-center?project_id=${encodeURIComponent(projectId)}` : `${API_BASE}/control-center`;
    const res = await apiFetch(url);
    return handleResponse(res, "Failed to fetch control center snapshot");
}

export async function fetchActivityFeed(
    limit = 60,
    projectId?: string | null,
    search?: string | null,
): Promise<ActivityEvent[]> {
    const baseUrl = projectId 
        ? `${API_BASE}/activity?limit=${limit}&project_id=${encodeURIComponent(projectId)}` 
        : `${API_BASE}/activity?limit=${limit}`;
    const res = await apiFetch(withSearch(baseUrl, search));
    return handleResponse(res, "Failed to fetch activity feed");
}

export async function fetchTaskActivity(taskId: number, projectId?: string | null): Promise<ActivityEvent[]> {
    const res = await apiFetch(withProjectId(`${API_BASE}/tasks/${taskId}/activity`, projectId));
    return handleResponse(res, "Failed to fetch task activity");
}

export async function fetchOperatorMetrics(projectId?: string | null): Promise<OperatorMetrics> {
    const res = await apiFetch(withProjectId(`${API_BASE.replace(/\/api$/, "")}/metrics`, projectId));
    return handleResponse(res, "Failed to fetch operator metrics");
}
