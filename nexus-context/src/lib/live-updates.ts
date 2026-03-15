import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { API_BASE } from "./api";
import { appQueryKeys } from "./queryKeys";

function eventStreamUrl(projectId?: string | null) {
    const base = `${API_BASE.replace(/\/api$/, "")}/events`;
    if (!projectId) {
        return base;
    }
    return `${base}?project_id=${encodeURIComponent(projectId)}`;
}

export function useLiveUpdates(projectId?: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const stream = new EventSource(eventStreamUrl(projectId));

        const refreshRelevantQueries = () => {
            void Promise.all([
                queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.all }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.tasks.all }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.projects.all }),
                queryClient.invalidateQueries({ queryKey: appQueryKeys.ops.all }),
            ]);
        };

        stream.addEventListener("domain.updated", refreshRelevantQueries);
        stream.addEventListener("project.imported", refreshRelevantQueries);
        stream.addEventListener("project.backup_created", refreshRelevantQueries);
        stream.addEventListener("request.failed", refreshRelevantQueries);

        return () => {
            stream.close();
        };
    }, [projectId, queryClient]);
}
