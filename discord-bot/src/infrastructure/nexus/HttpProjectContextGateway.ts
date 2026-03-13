import type {
    ActivityEventModel,
    ControlCenterSnapshot,
    ProjectContextBundle,
    ProjectModel,
    ResumePacket,
    TaskMemorySummary,
    TaskModel,
} from "../../domain/models/nexus.js";
import type { ProjectContextGateway } from "../../domain/ports/ProjectContextGateway.js";

type QueryValue = string | number | undefined;
type QueryMap = Record<string, QueryValue>;

export class HttpProjectContextGateway implements ProjectContextGateway {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;

    constructor(baseUrl: string, timeoutMs = 15000) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.timeoutMs = timeoutMs;
    }

    async listProjects(): Promise<ProjectModel[]> {
        return this.requestJson<ProjectModel[]>("/projects");
    }

    async getProject(projectId: string): Promise<ProjectModel> {
        return this.requestJson<ProjectModel>(`/projects/${encodeURIComponent(projectId)}`);
    }

    async getTasks(projectId: string): Promise<TaskModel[]> {
        return this.requestJson<TaskModel[]>("/tasks", { project_id: projectId });
    }

    async getControlCenter(projectId: string): Promise<ControlCenterSnapshot> {
        return this.requestJson<ControlCenterSnapshot>("/control-center", { project_id: projectId });
    }

    async getMemory(projectId: string): Promise<TaskMemorySummary[]> {
        return this.requestJson<TaskMemorySummary[]>("/memory", { project_id: projectId });
    }

    async getActivity(projectId: string, limit = 24): Promise<ActivityEventModel[]> {
        return this.requestJson<ActivityEventModel[]>("/activity", { project_id: projectId, limit });
    }

    async getResumePacket(taskId: number): Promise<ResumePacket> {
        return this.requestJson<ResumePacket>(`/tasks/${taskId}/resume-packet`);
    }

    async getProjectContextBundle(projectId: string): Promise<ProjectContextBundle> {
        const [project, tasks, controlCenter, memory, activity] = await Promise.all([
            this.getProject(projectId),
            this.getTasks(projectId),
            this.getControlCenter(projectId),
            this.getMemory(projectId),
            this.getActivity(projectId, 24),
        ]);

        return {
            project,
            tasks,
            controlCenter,
            memory,
            activity,
            generatedAt: new Date().toISOString(),
        };
    }

    private buildUrl(path: string, query: QueryMap = {}): URL {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        const url = new URL(`${this.baseUrl}${normalizedPath}`);
        for (const [key, value] of Object.entries(query)) {
            if (value === undefined || value === "") {
                continue;
            }
            url.searchParams.set(key, String(value));
        }
        return url;
    }

    private async requestJson<T>(path: string, query: QueryMap = {}): Promise<T> {
        const url = this.buildUrl(path, query);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                const detail = await this.safeReadText(response);
                throw new Error(
                    `Nexus API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
                );
            }

            return (await response.json()) as T;
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new Error(`Nexus API timeout (${this.timeoutMs}ms) for ${url.pathname}`);
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    private async safeReadText(response: Response): Promise<string> {
        try {
            return (await response.text()).trim();
        } catch {
            return "";
        }
    }
}
