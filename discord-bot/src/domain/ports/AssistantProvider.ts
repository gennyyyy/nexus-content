import type { AssistantRequest } from "../models/assistant.js";

export interface AssistantProvider {
    readonly name: string;
    answer(request: AssistantRequest): Promise<string>;
}
