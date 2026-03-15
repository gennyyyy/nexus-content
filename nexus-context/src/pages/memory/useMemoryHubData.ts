import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";

import { fetchMemoryOverview, fetchTasksWithOptions } from "../../lib/api";
import { useLiveUpdates } from "../../lib/live-updates";
import { appQueryKeys } from "../../lib/queryKeys";

export function useMemoryOverviewQuery(projectId?: string | null, search?: string) {
    useLiveUpdates(projectId);
    const deferredSearch = useDeferredValue(search ?? "");

    return useQuery({
        queryKey: appQueryKeys.memory.overview(projectId, deferredSearch),
        queryFn: () => fetchMemoryOverview(projectId, deferredSearch),
    });
}

export function useMemoryTasksQuery(
    projectId?: string | null,
    options?: { includeArchived?: boolean },
) {
    return useQuery({
        queryKey: appQueryKeys.tasks.list(projectId, options?.includeArchived),
        queryFn: () => fetchTasksWithOptions(projectId, options),
    });
}
