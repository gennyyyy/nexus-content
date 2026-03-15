import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    createProject,
    fetchControlCenterSnapshot,
    fetchProjectsWithOptions,
    type Project,
} from "../../lib/api";
import { appQueryKeys } from "../../lib/queryKeys";

export function useProjectsQuery(includeArchived = false) {
    return useQuery({
        queryKey: appQueryKeys.projects.list(includeArchived),
        queryFn: () => fetchProjectsWithOptions({ includeArchived }),
    });
}

export function useGlobalControlCenterQuery() {
    return useQuery({
        queryKey: appQueryKeys.controlCenter.snapshot(null),
        queryFn: () => fetchControlCenterSnapshot(null),
        retry: false,
    });
}

export function useCreateProjectMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (project: Partial<Project>) => createProject(project),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: appQueryKeys.projects.all }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.snapshot(null) }),
            ]);
        },
    });
}
