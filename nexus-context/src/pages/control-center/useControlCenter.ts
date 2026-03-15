import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { appQueryKeys } from "../../lib/queryKeys";
import { useControlCenterMetrics } from "./useControlCenterMetrics";

type TaskPreviewSource = ReadyQueueItem | AttentionTaskItem | HandoffPulseItem;

function buildActivityTaskPreview(event: ActivityEvent): Task | null {
    if (!event.task_id) {
        return null;
    }

    return {
        id: event.task_id,
        title: event.task_title || event.title,
        status: "todo",
        description: event.summary,
        priority: "medium",
    };
}

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

export function useControlCenter(projectId?: string) {
    const [selectedReadyTaskId, setSelectedReadyTaskId] = useState<number | null>(null);
    const [contextTask, setContextTask] = useState<Task | null>(null);
    const [activitySearch, setActivitySearch] = useState("");
    const deferredActivitySearch = useDeferredValue(activitySearch);

    const snapshotQuery = useQuery<ControlCenterSnapshot>({
        queryKey: appQueryKeys.controlCenter.snapshot(projectId),
        queryFn: () => fetchControlCenterSnapshot(projectId),
        refetchInterval: 30000,
    });

    const activityQuery = useQuery<ActivityEvent[]>({
        queryKey: appQueryKeys.controlCenter.activity(projectId, 60, deferredActivitySearch),
        queryFn: () => fetchActivityFeed(60, projectId, deferredActivitySearch),
        refetchInterval: 30000,
    });

    const snapshot = snapshotQuery.data ?? null;
    const activity = activityQuery.data ?? [];
    const loading = snapshotQuery.isLoading || activityQuery.isLoading;
    const refreshing = snapshotQuery.isFetching || activityQuery.isFetching;
    const error = snapshotQuery.error || activityQuery.error;

    const refresh = useCallback(() => {
        void Promise.all([snapshotQuery.refetch(), activityQuery.refetch()]);
    }, [activityQuery, snapshotQuery]);

    const selectedReadyTask = useMemo(
        () => {
            if (!snapshot) {
                return null;
            }
            if (
                selectedReadyTaskId &&
                snapshot.ready_queue.some((item) => item.task_id === selectedReadyTaskId)
            ) {
                return (
                    snapshot.ready_queue.find((item) => item.task_id === selectedReadyTaskId) ?? null
                );
            }
            return snapshot.ready_queue[0] ?? null;
        },
        [selectedReadyTaskId, snapshot],
    );

    const effectiveSelectedReadyTaskId = selectedReadyTask?.task_id ?? null;

    const resumePacketQuery = useQuery<ResumePacket>({
        queryKey: appQueryKeys.controlCenter.resumePacket(effectiveSelectedReadyTaskId, projectId),
        queryFn: () => fetchTaskResumePacket(effectiveSelectedReadyTaskId!, projectId),
        enabled: effectiveSelectedReadyTaskId != null,
    });

    const resumePacket = resumePacketQuery.data ?? null;
    const resumeLoading = resumePacketQuery.isLoading || resumePacketQuery.isFetching;
    const resumeError = resumePacketQuery.error;
    const metricsQuery = useControlCenterMetrics(projectId);

    const lastUpdated = snapshot?.generated_at ? new Date(snapshot.generated_at) : null;

    const openContextTask = useCallback((source: TaskPreviewSource) => {
        setContextTask(buildTaskPreview(source));
    }, []);

    const closeContextTask = useCallback(() => {
        setContextTask(null);
    }, []);

    const openActivityContextTask = useCallback((event: ActivityEvent) => {
        const task = buildActivityTaskPreview(event);
        if (task) {
            setContextTask(task);
        }
    }, []);

    return {
        snapshot,
        activity,
        loading,
        refreshing,
        error: error instanceof Error ? error.message : error ? "Could not load the control center." : null,
        lastUpdated,
        refresh,
        selectedReadyTask,
        selectReadyTask: setSelectedReadyTaskId,
        resumePacket,
        resumeLoading,
        resumeError: resumeError instanceof Error ? resumeError.message : resumeError ? "Could not load the resume packet for this task." : null,
        metrics: metricsQuery.data ?? null,
        metricsLoading: metricsQuery.isLoading || metricsQuery.isFetching,
        metricsError: metricsQuery.error instanceof Error ? metricsQuery.error.message : metricsQuery.error ? "Could not load operator metrics." : null,
        contextTask,
        openContextTask,
        openActivityContextTask,
        closeContextTask,
        selectedReadyTaskId: effectiveSelectedReadyTaskId,
        activitySearch,
        setActivitySearch,
    };
}
