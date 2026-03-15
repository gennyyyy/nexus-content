export const appQueryKeys = {
    ops: {
        all: ["ops"] as const,
        metrics: (projectId?: string | null) => [...appQueryKeys.ops.all, "metrics", projectId] as const,
    },
    projects: {
        all: ["projects"] as const,
        list: (includeArchived = false) => [...appQueryKeys.projects.all, "list", includeArchived] as const,
    },
    tasks: {
        all: ["tasks"] as const,
        list: (projectId?: string | null, includeArchived = false) => [...appQueryKeys.tasks.all, "list", projectId, includeArchived] as const,
        activity: (taskId: number, projectId?: string | null) => [...appQueryKeys.tasks.all, "activity", projectId, taskId] as const,
    },
    controlCenter: {
        all: ["control-center"] as const,
        snapshot: (projectId?: string | null) => [...appQueryKeys.controlCenter.all, "snapshot", projectId] as const,
        activity: (projectId?: string | null, limit = 60, search = "") => [...appQueryKeys.controlCenter.all, "activity", projectId, limit, search] as const,
        resumePacket: (taskId?: number | null, projectId?: string | null) => [...appQueryKeys.controlCenter.all, "resume-packet", projectId, taskId] as const,
    },
    memory: {
        all: ["memory"] as const,
        overview: (projectId?: string | null, search = "") => [...appQueryKeys.memory.all, "overview", projectId, search] as const,
        taskContext: (taskId?: number | null, projectId?: string | null) => [...appQueryKeys.memory.all, "task-context", projectId, taskId] as const,
        taskMemory: (taskId?: number | null, projectId?: string | null) => [...appQueryKeys.memory.all, "task-memory", projectId, taskId] as const,
        taskResumePacket: (taskId?: number | null, projectId?: string | null) => [...appQueryKeys.memory.all, "task-resume-packet", projectId, taskId] as const,
    },
} as const;
