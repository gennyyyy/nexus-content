import { useEffect, useState, useRef, useCallback } from "react";
import { X, AlignLeft, Clock, Brain, GitBranch, Flag, HelpCircle, Save, ListChecks, Workflow } from "lucide-react";
import {
    createTaskContext,
    fetchTaskContext,
    fetchTaskMemory,
    fetchTaskResumePacket,
    type ContextEntry,
    type ResumePacket,
    type Task,
    type TaskMemorySummary,
} from "../lib/api";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "../lib/utils";

interface Props {
    task: Task | null;
    onClose: () => void;
}

export function TaskContextModal({ task, onClose }: Props) {
    const [entries, setEntries] = useState<ContextEntry[]>([]);
    const [memory, setMemory] = useState<TaskMemorySummary | null>(null);
    const [resumePacket, setResumePacket] = useState<ResumePacket | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        summary: "",
        what_changed: "",
        files_touched: "",
        decisions: "",
        open_questions: "",
        next_step: "",
    });
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }
            // Focus trapping
            if (e.key === "Tab" && panelRef.current) {
                const focusable = panelRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last?.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first?.focus();
                    }
                }
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (task) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [task, handleKeyDown]);

    useEffect(() => {
        if (task?.id) {
            setLoading(true);
            setError(null);
            Promise.all([
                fetchTaskContext(task.id),
                fetchTaskMemory(task.id),
                fetchTaskResumePacket(task.id),
            ])
                .then(([contextEntries, taskMemory, taskResumePacket]) => {
                    setEntries(contextEntries);
                    setMemory(taskMemory);
                    setResumePacket(taskResumePacket);
                })
                .catch((err: unknown) => {
                    console.error(err);
                    setError("Could not load task memory.");
                })
                .finally(() => setLoading(false));
        } else {
            setEntries([]);
            setMemory(null);
            setResumePacket(null);
            setForm({
                summary: "",
                what_changed: "",
                files_touched: "",
                decisions: "",
                open_questions: "",
                next_step: "",
            });
        }
    }, [task]);

    function updateForm(field: keyof typeof form, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSaveMemory(e: React.FormEvent) {
        e.preventDefault();
        if (!task?.id || !form.summary.trim() || !form.next_step.trim()) return;

        setSaving(true);
        setError(null);
        try {
            await createTaskContext(task.id, {
                entry_type: "handoff",
                summary: form.summary.trim(),
                what_changed: form.what_changed.trim(),
                files_touched: form.files_touched.trim(),
                decisions: form.decisions.trim(),
                open_questions: form.open_questions.trim(),
                next_step: form.next_step.trim(),
            });

            const [contextEntries, taskMemory, taskResumePacket] = await Promise.all([
                fetchTaskContext(task.id),
                fetchTaskMemory(task.id),
                fetchTaskResumePacket(task.id),
            ]);
            setEntries(contextEntries);
            setMemory(taskMemory);
            setResumePacket(taskResumePacket);
            setForm({
                summary: "",
                what_changed: "",
                files_touched: "",
                decisions: "",
                open_questions: "",
                next_step: "",
            });
        } catch (err) {
            console.error(err);
            setError("Could not save memory handoff.");
        } finally {
            setSaving(false);
        }
    }

    if (!task) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} aria-hidden="true" />

            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-context-modal-title"
                className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col pt-14"
            >
                <button onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" aria-label="Close context panel">
                    <X size={20} />
                </button>

                <div className="px-6 pb-5 border-b border-zinc-800/60">
                    <div className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1.5">TASK ID: {task.id}</div>
                    <h2 id="task-context-modal-title" className="text-xl font-bold text-white mb-3 leading-tight">{task.title}</h2>

                    <div className="flex items-start gap-3 text-zinc-400 bg-zinc-900/40 p-3 border border-zinc-800/60">
                        <AlignLeft size={16} className="mt-0.5 shrink-0 text-zinc-500" />
                        <p className="text-sm leading-relaxed">{task.description || "No description provided."}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 nexus-scroll">
                    {/* Agent Memory */}
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

                    {/* Resume Packet */}
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

                    {/* Structured Handoff Form */}
                    <div className="mb-6 border border-zinc-800 bg-zinc-900/50 p-4">
                        <div>
                            <h3 className="text-base font-semibold text-zinc-100">Structured Handoff</h3>
                            <p className="mt-0.5 text-sm text-zinc-400">`Summary` and `Next Step` are required so another agent can resume cleanly.</p>
                        </div>

                        <form onSubmit={handleSaveMemory} className="mt-3 space-y-3">
                            <Field
                                label="Summary"
                                placeholder="What should the next agent know first?"
                                value={form.summary}
                                onChange={(value) => updateForm("summary", value)}
                                required
                            />
                            <Field
                                label="What Changed"
                                placeholder="What did you implement, investigate, or verify?"
                                value={form.what_changed}
                                onChange={(value) => updateForm("what_changed", value)}
                                multiline
                            />
                            <Field
                                label="Files Touched"
                                placeholder={"src/App.tsx\nbackend/main.py"}
                                value={form.files_touched}
                                onChange={(value) => updateForm("files_touched", value)}
                                multiline
                            />
                            <Field
                                label="Decisions"
                                placeholder="List decisions or constraints that should not be forgotten."
                                value={form.decisions}
                                onChange={(value) => updateForm("decisions", value)}
                                multiline
                            />
                            <Field
                                label="Open Questions"
                                placeholder="What is still uncertain or blocked?"
                                value={form.open_questions}
                                onChange={(value) => updateForm("open_questions", value)}
                                multiline
                            />
                            <Field
                                label="Next Step"
                                placeholder="What should happen next?"
                                value={form.next_step}
                                onChange={(value) => updateForm("next_step", value)}
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

                    {/* Context Logs Timeline */}
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
                </div>
            </div>
        </>
    );
}

interface FieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    required?: boolean;
}

function Field({ label, placeholder, value, onChange, multiline = false, required = false }: FieldProps) {
    const className = "w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-600";
    return (
        <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {label} {required ? <span className="text-rose-400">*</span> : null}
            </div>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`${className} min-h-[5rem] resize-y`}
                />
            ) : (
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={className}
                />
            )}
        </label>
    );
}

interface StatusPillProps {
    label: string;
    tone: "good" | "warn" | "danger" | "neutral";
}

function StatusPill({ label, tone }: StatusPillProps) {
    const toneClass = {
        good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        danger: "border-rose-500/30 bg-rose-500/10 text-rose-300",
        neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
    }[tone];

    return (
        <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
            {label}
        </span>
    );
}

interface MemoryListProps {
    title: string;
    icon: React.ReactNode;
    items: string[];
    empty: string;
}

function MemoryList({ title, icon, items, empty }: MemoryListProps) {
    return (
        <div className="border border-zinc-800/80 bg-black/20 p-2.5">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {icon} {title}
            </div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                        <span key={item} className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-zinc-500">{empty}</p>
            )}
        </div>
    );
}
