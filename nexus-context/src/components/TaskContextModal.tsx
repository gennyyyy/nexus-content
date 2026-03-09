import { useEffect, useState } from "react";
import { X, AlignLeft, Clock, Brain, GitBranch, Flag, HelpCircle, Save } from "lucide-react";
import {
    createTaskContext,
    fetchTaskContext,
    fetchTaskMemory,
    type ContextEntry,
    type Task,
    type TaskMemorySummary,
} from "../lib/api";

interface Props {
    task: Task | null;
    onClose: () => void;
}

export function TaskContextModal({ task, onClose }: Props) {
    const [entries, setEntries] = useState<ContextEntry[]>([]);
    const [memory, setMemory] = useState<TaskMemorySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showManualHandoff, setShowManualHandoff] = useState(false);
    const [form, setForm] = useState({
        summary: "",
        what_changed: "",
        files_touched: "",
        decisions: "",
        open_questions: "",
        next_step: "",
    });

    useEffect(() => {
        if (task?.id) {
            setLoading(true);
            setError(null);
            Promise.all([
                fetchTaskContext(task.id),
                fetchTaskMemory(task.id),
            ])
                .then(([contextEntries, taskMemory]) => {
                    setEntries(contextEntries);
                    setMemory(taskMemory);
                })
                .catch((err: unknown) => {
                    console.error(err);
                    setError("Could not load task memory.");
                })
                .finally(() => setLoading(false));
        } else {
            setEntries([]);
            setMemory(null);
            setForm({
                summary: "",
                what_changed: "",
                files_touched: "",
                decisions: "",
                open_questions: "",
                next_step: "",
            });
            setShowManualHandoff(false);
        }
    }, [task]);

    function updateForm(field: keyof typeof form, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSaveMemory(e: React.FormEvent) {
        e.preventDefault();
        if (!task?.id || !form.summary.trim()) return;

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

            const [contextEntries, taskMemory] = await Promise.all([
                fetchTaskContext(task.id),
                fetchTaskMemory(task.id),
            ]);
            setEntries(contextEntries);
            setMemory(taskMemory);
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />

            <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col pt-16 animation-slide-in">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="px-8 pb-6 border-b border-zinc-800/60">
                    <div className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-2">TASK ID: {task.id}</div>
                    <h2 className="text-2xl font-bold text-white mb-4 leading-tight">{task.title}</h2>

                    <div className="flex items-start gap-3 text-zinc-400 bg-zinc-900/40 p-4 rounded-lg border border-zinc-800/60">
                        <AlignLeft size={18} className="mt-0.5 shrink-0 text-zinc-500" />
                        <p className="text-sm leading-relaxed">{task.description || "No description provided."}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                    <div className="mb-8 rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                            <Brain size={18} className="text-blue-400" /> Agent Memory
                        </h3>
                        {loading ? (
                            <div className="space-y-3">
                                <div className="h-4 w-2/3 rounded bg-zinc-900/60 animate-pulse" />
                                <div className="h-4 w-1/2 rounded bg-zinc-900/60 animate-pulse" />
                            </div>
                        ) : memory ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.24em] text-blue-400 mb-1">Latest Summary</div>
                                    <p className="text-sm text-zinc-200 leading-relaxed">{memory.latest_summary || "No handoff saved yet."}</p>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-400 mb-1">Next Step</div>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{memory.latest_next_step || "No next step captured yet."}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <MemoryList title="Recent Files" icon={<GitBranch size={14} className="text-zinc-400" />} items={memory.recent_files} empty="No files tracked yet." />
                                    <MemoryList title="Decisions" icon={<Flag size={14} className="text-zinc-400" />} items={memory.active_decisions} empty="No decisions recorded yet." />
                                    <MemoryList title="Open Questions" icon={<HelpCircle size={14} className="text-zinc-400" />} items={memory.open_questions} empty="No open questions right now." />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-100">Manual Handoff</h3>
                                <p className="mt-1 text-sm text-zinc-400">Optional. Leave this hidden if you want the agent to write memory later.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowManualHandoff((current) => !current)}
                                className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600"
                            >
                                <Save size={16} /> {showManualHandoff ? "Hide Form" : "Write Manual Handoff"}
                            </button>
                        </div>

                        {showManualHandoff && (
                            <form onSubmit={handleSaveMemory} className="mt-4 space-y-4">
                                <Field
                                    label="Summary"
                                    placeholder="What should the next agent know first?"
                                    value={form.summary}
                                    onChange={(value) => updateForm("summary", value)}
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
                                />
                                <button
                                    type="submit"
                                    disabled={saving || !form.summary.trim()}
                                    className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
                                >
                                    <Save size={16} /> {saving ? "Saving..." : "Save Memory"}
                                </button>
                                {error && <p className="text-sm text-rose-400">{error}</p>}
                            </form>
                        )}
                    </div>

                    <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-blue-500" /> Context & Logs
                    </h3>

                    {loading ? (
                        <div className="space-y-4">
                            <div className="h-20 bg-zinc-900/50 rounded-lg animate-pulse" />
                            <div className="h-32 bg-zinc-900/50 rounded-lg animate-pulse" />
                            <div className="h-24 bg-zinc-900/50 rounded-lg animate-pulse" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 text-sm bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                            No context logs found for this task yet.<br />The AI MCP agent will write its progress here.
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-zinc-800 ml-3 space-y-8 pb-12">
                            {entries.map((entry, idx) => {
                                const date = new Date(entry.timestamp!);
                                return (
                                    <div key={idx} className="relative pl-6 group">
                                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-zinc-950 group-hover:scale-125 transition-transform" />
                                        <div className="text-[11px] font-semibold text-zinc-500 tracking-wider mb-1 uppercase">
                                            {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                                        </div>
                                        <div className="mb-2 inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                            {entry.entry_type || "note"}
                                        </div>
                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-sm space-y-3">
                                            {entry.summary && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 mb-1">Summary</div>
                                                    <p>{entry.summary}</p>
                                                </div>
                                            )}
                                            {entry.what_changed && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">What Changed</div>
                                                    <p>{entry.what_changed}</p>
                                                </div>
                                            )}
                                            {entry.files_touched && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Files</div>
                                                    <p>{entry.files_touched}</p>
                                                </div>
                                            )}
                                            {entry.decisions && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Decisions</div>
                                                    <p>{entry.decisions}</p>
                                                </div>
                                            )}
                                            {entry.open_questions && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Open Questions</div>
                                                    <p>{entry.open_questions}</p>
                                                </div>
                                            )}
                                            {entry.next_step && (
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-1">Next Step</div>
                                                    <p>{entry.next_step}</p>
                                                </div>
                                            )}
                                            {!entry.summary && !entry.what_changed && !entry.decisions && !entry.open_questions && !entry.next_step && (
                                                <p>{entry.content}</p>
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
}

function Field({ label, placeholder, value, onChange, multiline = false }: FieldProps) {
    const className = "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/60";
    return (
        <label className="block">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`${className} min-h-[5.5rem] resize-y`}
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

interface MemoryListProps {
    title: string;
    icon: React.ReactNode;
    items: string[];
    empty: string;
}

function MemoryList({ title, icon, items, empty }: MemoryListProps) {
    return (
        <div className="rounded-xl border border-zinc-800/80 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {icon} {title}
            </div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span key={item} className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
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
