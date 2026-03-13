import type {
    ActivityEventModel,
    ControlCenterSnapshot,
    ProjectContextBundle,
    ProjectModel,
    ResumePacket,
    TaskMemorySummary,
    TaskModel,
} from "../models/nexus.js";

export interface ProjectContextGateway {
    listProjects(): Promise<ProjectModel[]>;
    getProject(projectId: string): Promise<ProjectModel>;
    getTasks(projectId: string): Promise<TaskModel[]>;
    getControlCenter(projectId: string): Promise<ControlCenterSnapshot>;
    getMemory(projectId: string): Promise<TaskMemorySummary[]>;
    getActivity(projectId: string, limit?: number): Promise<ActivityEventModel[]>;
    getResumePacket(taskId: number): Promise<ResumePacket>;
    getProjectContextBundle(projectId: string): Promise<ProjectContextBundle>;
}
