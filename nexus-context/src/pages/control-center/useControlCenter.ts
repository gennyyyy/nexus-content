import { useCallback, useEffect, useMemo, useState } from "react";
import {
    fetchActivityFeed,
    fetchControlCenterSnapshot,
    fetchTaskResumePacket,
    type ActivityEvent,
    type AttentionTaskItem,
    type ControlCenterSnapshot,
    type HandoffPulseItem,
    type ReadyQueueItem,
    type ResumePacket,
    type Task,
} from "../../lib/api";

type TaskPreviewSource = ReadyQueueItem | AttentionTaskItem | HandoffPulseItem;

function toTaskPriority(value: string | undefined): Task["priority"] {
    if (value === "low" || value === "medium" || value === "high" || value === "critical") {
        return value;
    }
    return "medium";
}

function buildTaskPreview(source: TaskPreviewSource): Task {
    return {
        id: source.task_id,
        title: source.task_title,
        status: source.task_status,
        priority: "priority" in source ? toTaskPriority(source.priority) : "medium",
        description: "description" in source ? source.description ?? undefined : undefined,
        labels: "labels" in source ? source.labels ?? undefined : undefined,
    };
}

export function useControlCenter() {
    const [snapshot, setSnapshot] = useState<ControlCenterSnapshot | null>(null);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedReadyTaskId, setSelectedReadyTaskId] = useState<number | null>(null);
    const [resumePacket, setResumePacket] = useState<ResumePacket | null>(null);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [contextTask, setContextTask] = useState<Task | null>(null);

    const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
        if (mode === "refresh") {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const [nextSnapshot, nextActivity] = await Promise.all([
                fetchControlCenterSnapshot(),
                fetchActivityFeed(60),
            ]);

            setSnapshot(nextSnapshot);
            setActivity(nextActivity);
            setError(null);
            setSelectedReadyTaskId((current) => {
                if (current && nextSnapshot.ready_queue.some((item) => item.task_id === current)) {
                    return current;
                }
                return nextSnapshot.ready_queue[0]?.task_id ?? null;
            });
        } catch (loadError) {
            console.error(loadError);
            setError("Could not load the control center.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            void loadData("refresh");
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [loadData]);

    useEffect(() => {
        if (!selectedReadyTaskId) {
            setResumePacket(null);
            setResumeError(null);
            return;
        }

        let cancelled = false;
        setResumeLoading(true);
        setResumeError(null);

        fetchTaskResumePacket(selectedReadyTaskId)
            .then((packet) => {
                if (!cancelled) {
                    setResumePacket(packet);
                }
            })
            .catch((resumeLoadError) => {
                console.error(resumeLoadError);
                if (!cancelled) {
                    setResumePacket(null);
                    setResumeError("Could not load the resume packet for this task.");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setResumeLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedReadyTaskId]);

    const selectedReadyTask = useMemo(
        () => snapshot?.ready_queue.find((item) => item.task_id === selectedReadyTaskId) ?? null,
        [selectedReadyTaskId, snapshot],
    );

    const lastUpdated = snapshot?.generated_at ? new Date(snapshot.generated_at) : null;

    const openContextTask = useCallback((source: TaskPreviewSource) => {
        setContextTask(buildTaskPreview(source));
    }, []);

    const closeContextTask = useCallback(() => {
        setContextTask(null);
    }, []);

    return {
        snapshot,
        activity,
        loading,
        refreshing,
        error,
        lastUpdated,
        refresh: () => loadData("refresh"),
        selectedReadyTask,
        selectReadyTask: setSelectedReadyTaskId,
        resumePacket,
        resumeLoading,
        resumeError,
        contextTask,
        openContextTask,
        closeContextTask,
    };
}
