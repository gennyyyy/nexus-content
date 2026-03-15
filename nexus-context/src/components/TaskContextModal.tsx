import { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useParams } from "react-router-dom";
import {
    type Task,
} from "../lib/api";
import {
    useCreateTaskContextMutation,
    useTaskContextEntriesQuery,
    useTaskMemoryQuery,
    useTaskResumePacketQuery,
} from "./task-context-modal/useTaskContextModalData";
import {
    AgentMemorySection,
    ContextTimelineSection,
    HandoffFormSection,
    ResumePacketSection,
    TaskContextModalHeader,
} from "./task-context-modal/TaskContextModalSections";
import { EMPTY_TASK_CONTEXT_FORM, type TaskContextForm } from "./task-context-modal/types";

interface Props {
    task: Task | null;
    onClose: () => void;
}

export function TaskContextModal({ task, onClose }: Props) {
    if (!task) return null;

    return <TaskContextModalPanel key={task.id ?? "task-context"} task={task} onClose={onClose} />;
}

function TaskContextModalPanel({ task, onClose }: { task: Task; onClose: () => void }) {
    const { projectId } = useParams();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_TASK_CONTEXT_FORM);
    const panelRef = useRef<HTMLDivElement>(null);
    const taskId = task?.id ?? null;
    const entriesQuery = useTaskContextEntriesQuery(taskId, projectId);
    const memoryQuery = useTaskMemoryQuery(taskId, projectId);
    const resumePacketQuery = useTaskResumePacketQuery(taskId, projectId);
    const createContextMutation = useCreateTaskContextMutation(taskId, projectId);
    const entries = entriesQuery.data ?? [];
    const memory = memoryQuery.data ?? null;
    const resumePacket = resumePacketQuery.data ?? null;
    const loading = entriesQuery.isLoading || memoryQuery.isLoading || resumePacketQuery.isLoading;
    const saving = createContextMutation.isPending;

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

    const error = submitError ?? (
        entriesQuery.error || memoryQuery.error || resumePacketQuery.error
            ? "Could not load task memory."
            : null
    );

    function updateForm(field: keyof TaskContextForm, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSaveMemory(e: React.FormEvent) {
        e.preventDefault();
        if (!task?.id || !form.summary.trim() || !form.next_step.trim()) return;

        setSubmitError(null);
        try {
            await createContextMutation.mutateAsync({
                entry_type: "handoff",
                summary: form.summary.trim(),
                what_changed: form.what_changed.trim(),
                files_touched: form.files_touched.trim(),
                decisions: form.decisions.trim(),
                open_questions: form.open_questions.trim(),
                next_step: form.next_step.trim(),
            });
            setForm(EMPTY_TASK_CONTEXT_FORM);
        } catch (err) {
            console.error(err);
            setSubmitError("Could not save memory handoff.");
        }
    }

    const currentForm = form;

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

                <TaskContextModalHeader task={task} />

                <div className="flex-1 overflow-y-auto px-6 py-5 nexus-scroll">
                    <AgentMemorySection loading={loading} memory={memory} />
                    <ResumePacketSection loading={loading} resumePacket={resumePacket} />
                    <HandoffFormSection
                        form={currentForm}
                        saving={saving}
                        error={error}
                        onSubmit={handleSaveMemory}
                        onChange={updateForm}
                    />
                    <ContextTimelineSection loading={loading} entries={entries} />
                </div>
            </div>
        </>
    );
}
