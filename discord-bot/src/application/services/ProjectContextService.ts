import type { ChannelBindingRepository } from "../../domain/ports/ChannelBindingRepository.js";
import type { ProjectContextGateway } from "../../domain/ports/ProjectContextGateway.js";
import type { ProjectContextBundle, ProjectModel, ResumePacket } from "../../domain/models/nexus.js";

export type ProjectSelectionSource = "explicit" | "bound" | "default";

export interface ResolvedProjectSelection {
    projectId: string;
    source: ProjectSelectionSource;
}

export class ProjectContextService {
    constructor(
        private readonly gateway: ProjectContextGateway,
        private readonly bindingRepository: ChannelBindingRepository,
        private readonly defaultProjectId?: string
    ) {}

    listProjects(): Promise<ProjectModel[]> {
        return this.gateway.listProjects();
    }

    async bindChannelProject(channelId: string, projectId: string): Promise<ProjectModel> {
        const project = await this.gateway.getProject(projectId);
        await this.bindingRepository.setProjectId(channelId, project.id);
        return project;
    }

    async clearChannelBinding(channelId: string): Promise<boolean> {
        return this.bindingRepository.clearProjectId(channelId);
    }

    async getChannelBinding(channelId: string): Promise<string | null> {
        return this.bindingRepository.getProjectId(channelId);
    }

    async resolveProjectSelection(channelId: string, explicitProjectId?: string): Promise<ResolvedProjectSelection> {
        const explicit = explicitProjectId?.trim();
        if (explicit) {
            return { projectId: explicit, source: "explicit" };
        }

        const boundProjectId = await this.bindingRepository.getProjectId(channelId);
        if (boundProjectId) {
            return { projectId: boundProjectId, source: "bound" };
        }

        if (this.defaultProjectId) {
            return { projectId: this.defaultProjectId, source: "default" };
        }

        throw new Error(
            "No project is connected to this channel. Use `!project use <project-id>` first or set DEFAULT_PROJECT_ID."
        );
    }

    async getBundleForChannel(
        channelId: string,
        explicitProjectId?: string
    ): Promise<{ selection: ResolvedProjectSelection; bundle: ProjectContextBundle }> {
        const selection = await this.resolveProjectSelection(channelId, explicitProjectId);
        const bundle = await this.gateway.getProjectContextBundle(selection.projectId);
        return { selection, bundle };
    }

    getResumePacket(taskId: number): Promise<ResumePacket> {
        return this.gateway.getResumePacket(taskId);
    }
}
