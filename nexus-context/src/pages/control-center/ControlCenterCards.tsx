import {
    ArrowRight,
    Brain,
    FileCode2,
    FileText,
    Flag,
    GitBranch,
    ListChecks,
    Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

import type {
    ActivityEvent,
    AttentionTaskItem,
    HandoffPulseItem,
    ReadyQueueItem,
    ResumePacket,
} from "../../lib/api";
import { cn } from "../../lib/utils";
import { SOURCE_STYLES, STATUS_LABELS } from "./constants";
import { Badge, EmptyState, InfoBlock } from "./ControlCenterPrimitives";
import { formatRelativeTime, formatTimestamp, priorityClass, splitLabels } from "./utils";

export function AttentionCard({
    task,
    onOpenContext,
}: {
    task: AttentionTaskItem;
    onOpenContext: () => void;
}) {
    return (
        <article className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-white">{task.task_title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[task.task_status]}</div>
                </div>
                <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", priorityClass(task.priority))}>
                    {task.priority}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {task.is_blocked ? (
                    <Badge className="border-rose-500/25 bg-rose-500/10 text-rose-200">
                        {task.blocked_by_open_count} blocker{task.blocked_by_open_count === 1 ? "" : "s"}
                    </Badge>
                ) : null}
                {task.missing_summary ? <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">Missing summary</Badge> : null}
                {task.missing_next_step ? <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-200">Missing next step</Badge> : null}
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{task.recent_entries} recent entries</Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBlock title="Latest summary" icon={<Brain size={14} className="text-sky-300" />}>
                    {task.latest_summary || "No summary recorded yet."}
                </InfoBlock>
                <InfoBlock title="Next step" icon={<ArrowRight size={14} className="text-emerald-300" />}>
                    {task.latest_next_step || "No next step recorded yet."}
                </InfoBlock>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-400">Clean this handoff before assigning the task to an agent.</div>
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory
                </button>
            </div>
        </article>
    );
}

export function HandoffCard({
    handoff,
    onOpenContext,
}: {
    handoff: HandoffPulseItem;
    onOpenContext: () => void;
}) {
    return (
        <article className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-base font-semibold text-white">{handoff.task_title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[handoff.task_status]}</div>
                </div>
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{formatRelativeTime(handoff.timestamp)}</Badge>
            </div>

            <div className="mt-4 grid gap-3">
                <InfoBlock title="Summary" icon={<Brain size={14} className="text-sky-300" />}>
                    {handoff.summary || "No summary recorded."}
                </InfoBlock>
                <InfoBlock title="Next step" icon={<ArrowRight size={14} className="text-emerald-300" />}>
                    {handoff.next_step || "No next step recorded."}
                </InfoBlock>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-400">{formatTimestamp(handoff.timestamp)}</div>
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory
                </button>
            </div>
        </article>
    );
}

export function ReadyQueueCard({
    task,
    selected,
    onSelect,
    onOpenContext,
}: {
    task: ReadyQueueItem;
    selected: boolean;
    onSelect: () => void;
    onOpenContext: () => void;
}) {
    return (
        <article
            className={cn(
                "rounded-[24px] border border-zinc-800/80 bg-black/20 transition",
                selected ? "border-sky-500/35 bg-sky-500/10 shadow-[0_18px_40px_rgba(14,165,233,0.12)]" : "hover:border-zinc-700",
            )}
        >
            <button type="button" onClick={onSelect} className="w-full px-4 py-4 text-left">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-base font-semibold text-white">{task.task_title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[task.task_status]}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", priorityClass(task.priority))}>
                            {task.priority}
                        </span>
                        <Badge className={task.handoff_complete ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}>
                            {task.handoff_complete ? "Handoff ready" : "Handoff incomplete"}
                        </Badge>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <InfoBlock title="Latest summary" icon={<Brain size={14} className="text-sky-300" />}>
                        {task.latest_summary || "No summary captured yet."}
                    </InfoBlock>
                    <InfoBlock title="Next step" icon={<ArrowRight size={14} className="text-emerald-300" />}>
                        {task.latest_next_step || "No next step captured yet."}
                    </InfoBlock>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge className="border-violet-500/25 bg-violet-500/10 text-violet-200">
                        Unblocks {task.blocks_open_count} task{task.blocks_open_count === 1 ? "" : "s"}
                    </Badge>
                    {splitLabels(task.labels).slice(0, 3).map((label) => (
                        <Badge key={label} className="border-zinc-700 bg-zinc-900 text-zinc-300">
                            {label}
                        </Badge>
                    ))}
                    {task.recent_files.slice(0, 2).map((file) => (
                        <Badge key={file} className="border-zinc-700 bg-black/20 text-zinc-400">
                            <FileCode2 size={12} />
                            {file}
                        </Badge>
                    ))}
                </div>
            </button>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-800/70 px-4 py-3">
                <div className="text-sm text-zinc-400">Select this task to inspect its resume packet.</div>
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory
                </button>
            </div>
        </article>
    );
}

export function DispatchPanel({
    task,
    resumeLoading,
    resumeError,
    resumePacket,
    onOpenContext,
    projectId,
}: {
    task: ReadyQueueItem | null;
    resumeLoading: boolean;
    resumeError: string | null;
    resumePacket: ResumePacket | null;
    onOpenContext: () => void;
    projectId?: string;
}) {
    if (!task) {
        return <EmptyState message="Select a ready task to generate a dispatch packet." />;
    }

    if (resumeLoading) {
        return (
            <div className="space-y-3">
                <div className="h-16 animate-pulse rounded-2xl bg-zinc-900/70" />
                <div className="h-28 animate-pulse rounded-2xl bg-zinc-900/70" />
                <div className="h-20 animate-pulse rounded-2xl bg-zinc-900/70" />
            </div>
        );
    }

    if (resumeError) {
        return <EmptyState message={resumeError} />;
    }

    if (!resumePacket) {
        return <EmptyState message="No resume packet available for this task yet." />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-lg font-semibold text-white">{task.task_title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{STATUS_LABELS[task.task_status]}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge className={resumePacket.handoff_complete ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}>
                            {resumePacket.handoff_complete ? "Handoff complete" : "Needs handoff cleanup"}
                        </Badge>
                        <Badge className={resumePacket.task_state.is_blocked ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"}>
                            {resumePacket.task_state.is_blocked ? "Blocked" : resumePacket.task_state.is_ready ? "Ready" : "Active"}
                        </Badge>
                    </div>
                </div>

                {task.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{task.description}</p>
                ) : null}
            </div>

            <InfoBlock title="Agent brief" icon={<Workflow size={14} className="text-emerald-300" />} className="whitespace-pre-wrap">
                {resumePacket.agent_brief}
            </InfoBlock>

            <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <ListChecks size={14} /> Recommended next actions
                </div>
                <div className="space-y-2">
                    {resumePacket.recommended_next_actions.map((action) => (
                        <div key={action} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
                            {action}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-3">
                <InfoBlock title="Recent files" icon={<GitBranch size={14} className="text-zinc-300" />}>
                    {resumePacket.memory.recent_files.length > 0 ? resumePacket.memory.recent_files.join(", ") : "No files tracked yet."}
                </InfoBlock>
                <InfoBlock title="Open questions" icon={<Flag size={14} className="text-amber-300" />}>
                    {resumePacket.memory.open_questions.length > 0 ? resumePacket.memory.open_questions.join(" • ") : "No open questions recorded."}
                </InfoBlock>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onOpenContext}
                    className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                    Open memory sheet
                </button>
                <Link
                    to={projectId ? `/projects/${projectId}/workspace` : "/projects"}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/15"
                >
                    Open workspace <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );
}

export function TimelineRow({ event, onOpenContext }: { event: ActivityEvent; onOpenContext?: () => void }) {
    const isClickable = !!onOpenContext;

    return (
        <article
            onClick={onOpenContext}
            className={cn(
                "rounded-[24px] border border-zinc-800/80 bg-black/20 p-4 transition-all duration-200 group",
                isClickable ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/40 active:scale-[0.99]" : "opacity-90"
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-base font-semibold text-white">{event.title}</div>
                        {isClickable && <ArrowRight size={14} className="text-zinc-600 transition-colors group-hover:text-sky-400" />}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-zinc-400">{event.summary}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Badge className={SOURCE_STYLES[event.source] || SOURCE_STYLES.system}>{event.source}</Badge>
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{event.actor}</Badge>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span>{formatTimestamp(event.created_at)}</span>
                <span>{formatRelativeTime(event.created_at)}</span>
                {event.task_title ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-400/80">
                        <FileText size={12} />
                        Task: {event.task_title}
                    </span>
                ) : null}
            </div>
        </article>
    );
}
