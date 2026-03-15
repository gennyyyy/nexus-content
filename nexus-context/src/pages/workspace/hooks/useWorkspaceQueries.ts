import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchWorkspaceSnapshot,
    createTask,
    updateTask,
    deleteTask,
    createDependency,
    deleteDependency,
    updateTaskArchiveState,
    type Task,
    type TaskDependency,
    type WorkspaceSnapshot
} from "../../../lib/api";
import { appQueryKeys } from "../../../lib/queryKeys";

export const workspaceKeys = {
    all: ["workspace"] as const,
    snapshot: (projectId?: string | null) => [...workspaceKeys.all, "snapshot", projectId] as const,
};

export function useWorkspaceSnapshot(projectId?: string | null) {
    return useQuery({
        queryKey: workspaceKeys.snapshot(projectId),
        queryFn: () => fetchWorkspaceSnapshot(projectId),
    });
}

export function useCreateTask(projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (task: Partial<Task>) => createTask(task),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workspaceKeys.snapshot(projectId) });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.tasks.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all });
        },
    });
}

export function useUpdateTask(projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...task }: Partial<Task> & { id: number }) => updateTask(id, task),
        onMutate: async ({ id, ...updatedFields }) => {
            const queryKey = workspaceKeys.snapshot(projectId);
            await queryClient.cancelQueries({ queryKey });

            const previousSnapshot = queryClient.getQueryData<WorkspaceSnapshot>(queryKey);

            if (previousSnapshot) {
                queryClient.setQueryData<WorkspaceSnapshot>(queryKey, {
                    ...previousSnapshot,
                    tasks: previousSnapshot.tasks.map(t => t.id === id ? { ...t, ...updatedFields } : t)
                });
            }

            return { previousSnapshot };
        },
        onError: (_err, _newTodo, context) => {
            if (context?.previousSnapshot) {
                queryClient.setQueryData(workspaceKeys.snapshot(projectId), context.previousSnapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: workspaceKeys.snapshot(projectId) });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.tasks.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all });
        },
    });
}

export function useDeleteTask(projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workspaceKeys.snapshot(projectId) });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.tasks.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all });
        },
    });
}

export function useArchiveTask(projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
            updateTaskArchiveState(id, archived),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workspaceKeys.snapshot(projectId) });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.tasks.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.all });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all });
        },
    });
}

export function useCreateDependency(projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dependency: TaskDependency) => createDependency(dependency),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workspaceKeys.snapshot(projectId) });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all });
        },
    });
}

export function useDeleteDependency(projectId?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteDependency(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: workspaceKeys.snapshot(projectId) });
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all });
        },
    });
}
