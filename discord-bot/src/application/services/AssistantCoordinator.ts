import type { AssistantProvider } from "../../domain/ports/AssistantProvider.js";
import { ProjectContextService } from "./ProjectContextService.js";

export class AssistantCoordinator {
    constructor(
        private readonly contextService: ProjectContextService,
        private readonly assistantProvider: AssistantProvider
    ) {}

    get providerName(): string {
        return this.assistantProvider.name;
    }

    async answer(channelId: string, question: string, explicitProjectId?: string): Promise<{
        projectId: string;
        source: "explicit" | "bound" | "default";
        provider: string;
        reply: string;
    }> {
        const { selection, bundle } = await this.contextService.getBundleForChannel(channelId, explicitProjectId);
        const reply = await this.assistantProvider.answer({
            question,
            projectId: selection.projectId,
            bundle,
        });

        return {
            projectId: selection.projectId,
            source: selection.source,
            provider: this.assistantProvider.name,
            reply,
        };
    }
}
