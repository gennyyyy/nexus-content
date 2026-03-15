import { useQuery } from "@tanstack/react-query";

import { fetchTaskActivity } from "../lib/api";
import { appQueryKeys } from "../lib/queryKeys";

export function useTaskActivity(taskId: number, projectId?: string | null) {
    return useQuery({
        queryKey: appQueryKeys.tasks.activity(taskId, projectId),
        queryFn: () => fetchTaskActivity(taskId, projectId),
    });
}
