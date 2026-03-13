import type { ProjectContextBundle } from "./nexus.js";

export interface AssistantRequest {
    question: string;
    projectId: string;
    bundle: ProjectContextBundle;
}
