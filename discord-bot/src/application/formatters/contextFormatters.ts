import type { ProjectContextBundle, ResumePacket } from "../../domain/models/nexus.js";
import { statusLabel } from "../../utils/text.js";

export function formatProjectBrief(bundle: ProjectContextBundle): string {
    const readyQueue = bundle.controlCenter.ready_queue.slice(0, 4);
    const activeTasks = bundle.tasks.filter((task) => task.status !== "done").slice(0, 6);
    const latestActivity = bundle.activity.slice(0, 4);

    const lines = [
        `**${bundle.project.name}** (\`${bundle.project.id}\`)`,
        `Tasks: **${bundle.controlCenter.total_tasks}** total | TODO **${bundle.controlCenter.todo_count}** | In Progress **${bundle.controlCenter.in_progress_count}** | Done **${bundle.controlCenter.done_count}**`,
        `Flow: Ready **${bundle.controlCenter.ready_count}** | Blocked **${bundle.controlCenter.blocked_count}** | Handoff gaps **${bundle.controlCenter.handoff_gap_count}**`,
        "",
        "**Active tasks**",
        activeTasks.length
            ? activeTasks.map((task) => `• #${task.id} ${task.title} _(status: ${statusLabel(task.status)})_`).join("\n")
            : "• No active tasks.",
        "",
        "**Top ready queue**",
        readyQueue.length
            ? readyQueue.map((item) => `• #${item.task_id} ${item.task_title} _(priority: ${item.priority})_`).join("\n")
            : "• No ready tasks right now.",
        "",
        "**Recent activity**",
        latestActivity.length ? latestActivity.map((event) => `• ${event.title}`).join("\n") : "• No recent activity.",
    ];

    return lines.join("\n");
}

export function formatResumePacket(packet: ResumePacket): string {
    const blockers = packet.blocked_by.slice(0, 4);
    const nextActions = packet.recommended_next_actions.slice(0, 5);
    const recentFiles = packet.memory.recent_files.slice(0, 6);

    const lines = [
        `**Resume Packet: #${packet.task.id} ${packet.task.title}**`,
        `Status: **${statusLabel(packet.task.status)}** | Ready: **${packet.task_state.is_ready ? "yes" : "no"}** | Blocked: **${packet.task_state.is_blocked ? "yes" : "no"}**`,
        `Handoff complete: **${packet.handoff_complete ? "yes" : "no"}**`,
        "",
        `Latest summary: ${packet.memory.latest_summary ?? "n/a"}`,
        `Next step: ${packet.memory.latest_next_step ?? "n/a"}`,
        "",
        "**Blockers**",
        blockers.length
            ? blockers.map((item) => `• #${item.task_id} ${item.task_title} (${statusLabel(item.task_status)})`).join("\n")
            : "• None",
        "",
        "**Recommended next actions**",
        nextActions.length ? nextActions.map((action) => `• ${action}`).join("\n") : "• No actions generated.",
        "",
        `Recent files: ${recentFiles.length ? recentFiles.join(", ") : "none"}`,
    ];

    return lines.join("\n");
}
