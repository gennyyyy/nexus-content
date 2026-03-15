import { useQuery } from "@tanstack/react-query";

import { fetchOperatorMetrics, type OperatorMetrics } from "../../lib/api";
import { appQueryKeys } from "../../lib/queryKeys";

export function useControlCenterMetrics(projectId?: string) {
    return useQuery<OperatorMetrics>({
        queryKey: appQueryKeys.ops.metrics(projectId),
        queryFn: () => fetchOperatorMetrics(projectId),
        refetchInterval: 30000,
    });
}
