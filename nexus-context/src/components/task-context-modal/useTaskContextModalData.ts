import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createTaskContext,
    fetchTaskContext,
    fetchTaskMemory,
    fetchTaskResumePacket,
    type ContextEntry,
} from "../../lib/api";
import { appQueryKeys } from "../../lib/queryKeys";

export function useTaskContextEntriesQuery(taskId?: number | null, projectId?: string | null) {
    return useQuery({
        queryKey: appQueryKeys.memory.taskContext(taskId, projectId),
        queryFn: () => fetchTaskContext(taskId!, projectId),
        enabled: taskId != null,
    });
}

export function useTaskMemoryQuery(taskId?: number | null, projectId?: string | null) {
    return useQuery({
        queryKey: appQueryKeys.memory.taskMemory(taskId, projectId),
        queryFn: () => fetchTaskMemory(taskId!, projectId),
        enabled: taskId != null,
    });
}

export function useTaskResumePacketQuery(taskId?: number | null, projectId?: string | null) {
    return useQuery({
        queryKey: appQueryKeys.memory.taskResumePacket(taskId, projectId),
        queryFn: () => fetchTaskResumePacket(taskId!, projectId),
        enabled: taskId != null,
    });
}

export function useCreateTaskContextMutation(taskId?: number | null, projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (entry: Partial<ContextEntry>) => createTaskContext(taskId!, entry, projectId),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.taskContext(taskId, projectId) }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.taskMemory(taskId, projectId) }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.taskResumePacket(taskId, projectId) }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.overview(projectId) }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.snapshot(projectId) }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.activity(projectId, 60) }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.resumePacket(taskId, projectId) }),
            ]);
        },
    });
}
