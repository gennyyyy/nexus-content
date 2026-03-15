import { AlignLeft, Brain, Clock, Flag, GitBranch, HelpCircle, ListChecks, Save, Workflow } from "lucide-react";

import type { ContextEntry, ResumePacket, Task, TaskMemorySummary } from "../../lib/api";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { cn } from "../../lib/utils";
import { Field, MemoryList, StatusPill } from "./TaskContextModalPrimitives";
import type { TaskContextForm } from "./types";

export function TaskContextModalHeader({ task }: { task: Task }) {
    return (
        <div className="px-6 pb-5 border-b border-zinc-800/60">
            <div className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1.5">TASK ID: {task.id}</div>
            <h2 id="task-context-modal-title" className="text-xl font-bold text-white mb-3 leading-tight">{task.title}</h2>

            <div className="flex items-start gap-3 text-zinc-400 bg-zinc-900/40 p-3 border border-zinc-800/60">
                <AlignLeft size={16} className="mt-0.5 shrink-0 text-zinc-500" />
                <p className="text-sm leading-relaxed">{task.description || "No description provided."}</p>
            </div>
        </div>
    );
}

export function AgentMemorySection({ loading, memory }: { loading: boolean; memory: TaskMemorySummary | null }) {
    return (
        <div className="mb-6 border border-blue-900/40 bg-blue-950/20 p-4">
            <h3 className="text-base font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <Brain size={16} className="text-blue-400" /> Agent Memory
            </h3>
            {loading ? (
                <div className="space-y-2">
                    <div className="h-4 w-2/3 bg-zinc-900/60 animate-pulse" />
                    <div className="h-4 w-1/2 bg-zinc-900/60 animate-pulse" />
                </div>
            ) : memory ? (
                <div className="space-y-3">
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-blue-400 mb-0.5">Latest Summary</div>
                        {memory.latest_summary ? <MarkdownRenderer content={memory.latest_summary} /> : <p className="text-sm text-zinc-400 leading-relaxed">No handoff saved yet.</p>}
                    </div>
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-400 mb-0.5">Next Step</div>
                        {memory.latest_next_step ? <MarkdownRenderer content={memory.latest_next_step} /> : <p className="text-sm text-zinc-400 leading-relaxed">No next step captured yet.</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <MemoryList title="Recent Files" icon={<GitBranch size={14} className="text-zinc-400" />} items={memory.recent_files} empty="No files tracked yet." />
                        <MemoryList title="Decisions" icon={<Flag size={14} className="text-zinc-400" />} items={memory.active_decisions} empty="No decisions recorded yet." />
                        <MemoryList title="Open Questions" icon={<HelpCircle size={14} className="text-zinc-400" />} items={memory.open_questions} empty="No open questions right now." />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function ResumePacketSection({ loading, resumePacket }: { loading: boolean; resumePacket: ResumePacket | null }) {
    return (
        <div className="mb-6 border border-emerald-900/40 bg-emerald-950/20 p-4">
            <h3 className="text-base font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <Workflow size={16} className="text-emerald-400" /> Resume Packet
            </h3>
            {loading ? (
                <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-zinc-900/60 animate-pulse" />
                    <div className="h-4 w-2/3 bg-zinc-900/60 animate-pulse" />
                </div>
            ) : resumePacket ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                        <StatusPill label={resumePacket.handoff_complete ? "Handoff complete" : "Handoff incomplete"} tone={resumePacket.handoff_complete ? "good" : "warn"} />
                        <StatusPill label={resumePacket.task_state.is_blocked ? "Blocked" : resumePacket.task_state.is_ready ? "Ready" : resumePacket.task.status === "in_progress" ? "Active" : "Idle"} tone={resumePacket.task_state.is_blocked ? "danger" : resumePacket.task_state.is_ready ? "good" : "neutral"} />
                    </div>
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-400 mb-0.5">Agent Brief</div>
                        <MarkdownRenderer content={resumePacket.agent_brief} />
                    </div>
                    <div>
                        <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                            <ListChecks size={14} /> Recommended Next Actions
                        </div>
                        <div className="space-y-1.5">
                            {resumePacket.recommended_next_actions.map((action) => (
                                <div key={action} className="border border-zinc-800/80 bg-black/20 px-3 py-2 text-sm text-zinc-300">
                                    {action}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function HandoffFormSection({
    form,
    saving,
    error,
    onSubmit,
    onChange,
}: {
    form: TaskContextForm;
    saving: boolean;
    error: string | null;
    onSubmit: (event: React.FormEvent) => void | Promise<void>;
    onChange: (field: keyof TaskContextForm, value: string) => void;
}) {
    return (
        <div className="mb-6 border border-zinc-800 bg-zinc-900/50 p-4">
            <div>
                <h3 className="text-base font-semibold text-zinc-100">Structured Handoff</h3>
                <p className="mt-0.5 text-sm text-zinc-400">`Summary` and `Next Step` are required so another agent can resume cleanly.</p>
            </div>

            <form onSubmit={onSubmit} className="mt-3 space-y-3">
                <Field
                    label="Summary"
                    placeholder="What should the next agent know first?"
                    value={form.summary}
                    onChange={(value) => onChange("summary", value)}
                    required
                />
                <Field
                    label="What Changed"
                    placeholder="What did you implement, investigate, or verify?"
                    value={form.what_changed}
                    onChange={(value) => onChange("what_changed", value)}
                    multiline
                />
                <Field
                    label="Files Touched"
                    placeholder={"src/App.tsx\nbackend/main.py"}
                    value={form.files_touched}
                    onChange={(value) => onChange("files_touched", value)}
                    multiline
                />
                <Field
                    label="Decisions"
                    placeholder="List decisions or constraints that should not be forgotten."
                    value={form.decisions}
                    onChange={(value) => onChange("decisions", value)}
                    multiline
                />
                <Field
                    label="Open Questions"
                    placeholder="What is still uncertain or blocked?"
                    value={form.open_questions}
                    onChange={(value) => onChange("open_questions", value)}
                    multiline
                />
                <Field
                    label="Next Step"
                    placeholder="What should happen next?"
                    value={form.next_step}
                    onChange={(value) => onChange("next_step", value)}
                    multiline
                    required
                />
                <button
                    type="submit"
                    disabled={saving || !form.summary.trim() || !form.next_step.trim()}
                    className="inline-flex items-center gap-2 bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
                >
                    <Save size={16} /> {saving ? "Saving..." : "Save Handoff"}
                </button>
                {error && <p className="text-sm text-rose-400">{error}</p>}
            </form>
        </div>
    );
}

export function ContextTimelineSection({ loading, entries }: { loading: boolean; entries: ContextEntry[] }) {
    return (
        <>
            <h3 className="text-base font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Context & Logs
            </h3>

            {loading ? (
                <div className="space-y-3">
                    <div className="h-20 bg-zinc-900/50 animate-pulse" />
                    <div className="h-32 bg-zinc-900/50 animate-pulse" />
                    <div className="h-24 bg-zinc-900/50 animate-pulse" />
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm bg-zinc-900/20 border border-dashed border-zinc-800">
                    No context logs found for this task yet.<br />The AI MCP agent will write its progress here.
                </div>
            ) : (
                <div className="relative border-l-2 border-zinc-800 ml-3 space-y-6 pb-10">
                    {[...entries]
                        .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
                        .map((entry, idx) => {
                            const date = new Date(entry.timestamp!);
                            const isLatest = idx === 0;
                            const isAgent = entry.source === "mcp";

                            return (
                                <div key={idx} className={cn("relative pl-5 group transition-all", isLatest && "scale-[1.01]")}>
                                    <div className={cn(
                                        "absolute w-3 h-3 rounded-full -left-[7px] top-1.5 ring-4 ring-zinc-950 group-hover:scale-125 transition-transform",
                                        isLatest ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "bg-zinc-700"
                                    )} />

                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="text-[11px] font-semibold text-zinc-500 tracking-wider uppercase">
                                            {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                                        </div>
                                        {isLatest && (
                                            <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 border border-blue-500/20">
                                                Latest Update
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <div className={cn(
                                            "inline-flex border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                                            entry.entry_type === "handoff" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-900 text-zinc-400"
                                        )}>
                                            {entry.entry_type || "note"}
                                        </div>

                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]",
                                            isAgent ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-zinc-700 bg-zinc-800 text-zinc-300"
                                        )}>
                                            {isAgent ? <Brain size={10} /> : <AlignLeft size={10} />}
                                            {entry.actor || "System"}
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "bg-zinc-900/60 border p-3 text-sm text-zinc-300 space-y-3 transition-colors",
                                        isLatest ? "border-blue-500/30 bg-blue-900/5" : "border-zinc-800/80"
                                    )}>
                                        {entry.summary && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 mb-0.5">Summary</div>
                                                <MarkdownRenderer content={entry.summary} />
                                            </div>
                                        )}
                                        {entry.what_changed && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-0.5">What Changed</div>
                                                <MarkdownRenderer content={entry.what_changed} />
                                            </div>
                                        )}
                                        {entry.files_touched && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Files</div>
                                                <MarkdownRenderer content={entry.files_touched} />
                                            </div>
                                        )}
                                        {entry.decisions && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Decisions</div>
                                                <MarkdownRenderer content={entry.decisions} />
                                            </div>
                                        )}
                                        {entry.open_questions && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Open Questions</div>
                                                <MarkdownRenderer content={entry.open_questions} />
                                            </div>
                                        )}
                                        {entry.next_step && (
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Next Step</div>
                                                <MarkdownRenderer content={entry.next_step} />
                                            </div>
                                        )}
                                        {!entry.summary && !entry.what_changed && !entry.decisions && !entry.open_questions && !entry.next_step && (
                                            <MarkdownRenderer content={entry.content} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </>
    );
}
