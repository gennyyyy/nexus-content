import type { AssistantRequest } from "../../domain/models/assistant.js";
import type { AssistantProvider } from "../../domain/ports/AssistantProvider.js";

interface OpenAiResponsesOutputItem {
    content?: Array<{ text?: string }>;
}

interface OpenAiResponsesPayload {
    output_text?: string;
    output?: OpenAiResponsesOutputItem[];
}

function asList<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

export class OpenAiAssistantProvider implements AssistantProvider {
    readonly name = "openai-responses";
    private readonly fallbackProvider?: AssistantProvider;

    constructor(
        private readonly apiKey: string,
        private readonly model: string,
        fallbackProvider?: AssistantProvider
    ) {
        this.fallbackProvider = fallbackProvider;
    }

    async answer(request: AssistantRequest): Promise<string> {
        try {
            const contextDigest = this.buildContextDigest(request);
            const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    temperature: 0.2,
                    max_output_tokens: 700,
                    input: [
                        {
                            role: "system",
                            content: [
                                {
                                    type: "input_text",
                                    text:
                                        "You are Nexus Assistant, helping software teams execute tasks. " +
                                        "You must ground answers in provided project context and keep responses practical.",
                                },
                            ],
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "input_text",
                                    text: `Project context:\n${contextDigest}\n\nQuestion:\n${request.question}`,
                                },
                            ],
                        },
                    ],
                }),
            });

            if (!response.ok) {
                const details = await response.text();
                throw new Error(`OpenAI request failed (${response.status}): ${details}`);
            }

            const payload = (await response.json()) as OpenAiResponsesPayload;
            const output = this.extractOutputText(payload);
            if (!output) {
                throw new Error("OpenAI returned an empty response.");
            }

            return output;
        } catch (error) {
            if (!this.fallbackProvider) {
                throw error;
            }

            console.error("[assistant] OpenAI provider failed, using fallback:", error);
            const fallbackReply = await this.fallbackProvider.answer(request);
            return `${fallbackReply}\n\n_(OpenAI fallback triggered.)_`;
        }
    }

    private extractOutputText(payload: OpenAiResponsesPayload): string {
        if (typeof payload.output_text === "string" && payload.output_text.trim()) {
            return payload.output_text.trim();
        }

        const chunks: string[] = [];
        for (const item of asList(payload.output)) {
            for (const content of asList(item.content)) {
                if (typeof content.text === "string" && content.text.trim()) {
                    chunks.push(content.text.trim());
                }
            }
        }

        return chunks.join("\n").trim();
    }

    private buildContextDigest(request: AssistantRequest): string {
        const readyQueue = request.bundle.controlCenter.ready_queue.slice(0, 8);
        const memoryHighlights = request.bundle.memory
            .filter((item) => item.latest_summary || item.latest_next_step)
            .slice(0, 8);
        const activity = request.bundle.activity.slice(0, 8);

        const lines = [
            `Project: ${request.bundle.project.name} (${request.bundle.project.id})`,
            `Counts: total=${request.bundle.controlCenter.total_tasks}, todo=${request.bundle.controlCenter.todo_count}, in_progress=${request.bundle.controlCenter.in_progress_count}, done=${request.bundle.controlCenter.done_count}`,
            `Flow: ready=${request.bundle.controlCenter.ready_count}, blocked=${request.bundle.controlCenter.blocked_count}, handoff_gaps=${request.bundle.controlCenter.handoff_gap_count}`,
            "",
            "Ready queue:",
            readyQueue.length
                ? readyQueue
                      .map(
                          (item) =>
                              `- #${item.task_id} ${item.task_title} | priority=${item.priority} | next=${item.latest_next_step ?? "n/a"}`
                      )
                      .join("\n")
                : "- none",
            "",
            "Memory highlights:",
            memoryHighlights.length
                ? memoryHighlights
                      .map(
                          (entry) =>
                              `- #${entry.task_id} ${entry.task_title} | summary=${entry.latest_summary ?? "n/a"} | next=${entry.latest_next_step ?? "n/a"}`
                      )
                      .join("\n")
                : "- none",
            "",
            "Recent activity:",
            activity.length ? activity.map((event) => `- ${event.title}: ${event.summary}`).join("\n") : "- none",
        ];

        return lines.join("\n");
    }
}
