import type { AssistantRequest } from "../../domain/models/assistant.js";
import type { AssistantProvider } from "../../domain/ports/AssistantProvider.js";

function asList<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

export class LocalAssistantProvider implements AssistantProvider {
    readonly name = "local-context";

    async answer(request: AssistantRequest): Promise<string> {
        const ready = asList(request.bundle.controlCenter.ready_queue).slice(0, 3);
        const blocked = asList(request.bundle.controlCenter.attention_tasks)
            .filter((task) => task.is_blocked)
            .slice(0, 3);
        const openQuestions = asList(request.bundle.memory)
            .flatMap((item) => asList(item.open_questions).map((questionText) => ({ taskId: item.task_id, questionText })))
            .slice(0, 4);

        const lines: string[] = [
            "Local assistant mode is active, so this answer is generated from your Nexus project context only.",
            "",
            `**Question:** ${request.question}`,
            "",
            `**Project:** ${request.bundle.project.name} (\`${request.projectId}\`)`,
            `• Ready tasks: ${request.bundle.controlCenter.ready_count}`,
            `• Blocked tasks: ${request.bundle.controlCenter.blocked_count}`,
            `• Handoff gaps: ${request.bundle.controlCenter.handoff_gap_count}`,
            "",
            "**Suggested next moves**",
        ];

        if (ready.length) {
            lines.push(
                ...ready.map((task) => {
                    const nextStep = task.latest_next_step ?? "Review latest task summary before implementation.";
                    return `• Start with #${task.task_id} ${task.task_title} — ${nextStep}`;
                })
            );
        } else {
            lines.push("• No ready tasks currently. Resolve blockers or close in-progress items first.");
        }

        if (blocked.length) {
            lines.push("", "**Known blockers**");
            lines.push(
                ...blocked.map((item) => `• #${item.task_id} ${item.task_title} has ${item.blocked_by_open_count} open blocker(s).`)
            );
        }

        if (openQuestions.length) {
            lines.push("", "**Open questions to resolve**");
            lines.push(...openQuestions.map((item) => `• Task #${item.taskId}: ${item.questionText}`));
        }

        return lines.join("\n");
    }
}
