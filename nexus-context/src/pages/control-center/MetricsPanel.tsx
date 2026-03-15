import { useMemo, useState, type ReactNode } from "react";
import { ActivitySquare, Database, Link2, ListChecks, ShieldCheck, TimerReset } from "lucide-react";

import type { OperatorMetrics } from "../../lib/api";
import { EmptyState, MiniMetric, SectionPanel } from "./ControlCenterPrimitives";

export function MetricsPanel({
    metrics,
    loading,
    error,
}: {
    metrics: OperatorMetrics | null;
    loading: boolean;
    error: string | null;
}) {
    const [requestSearch, setRequestSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "failed">("all");
    const [requestLimit, setRequestLimit] = useState(8);

    const filteredRequests = useMemo(() => {
        if (!metrics) {
            return [];
        }

        const normalizedSearch = requestSearch.trim().toLowerCase();

        return metrics.recent_requests.filter((request) => {
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "failed" ? request.failed : !request.failed);

            if (!matchesStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return (
                request.request_id.toLowerCase().includes(normalizedSearch) ||
                request.path.toLowerCase().includes(normalizedSearch) ||
                String(request.status_code).includes(normalizedSearch)
            );
        });
    }, [metrics, requestSearch, statusFilter]);

    return (
        <SectionPanel
            title="Operator metrics"
            description="A compact backend summary for readiness, flow, and request tracing."
        >
            {loading && !metrics ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div key={index} className="h-24 animate-pulse rounded-2xl bg-zinc-900/70" />
                    ))}
                </div>
            ) : error ? (
                <EmptyState message={error} />
            ) : metrics ? (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <MiniMetric label="Tasks" value={metrics.task_count} />
                        <MiniMetric label="Dependencies" value={metrics.dependency_count} />
                        <MiniMetric label="Context entries" value={metrics.context_entry_count} />
                        <MiniMetric label="Ready" value={metrics.ready_task_count} />
                        <MiniMetric label="Blocked" value={metrics.blocked_task_count} />
                        <MiniMetric label="In progress" value={metrics.in_progress_task_count} />
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                        <MetricInfoCard
                            icon={<ListChecks size={16} className="text-sky-300" />}
                            title="Backlog mix"
                            body={`Todo ${metrics.todo_task_count} • Done ${metrics.done_task_count}`}
                        />
                        <MetricInfoCard
                            icon={<Database size={16} className="text-emerald-300" />}
                            title="Environment"
                            body={metrics.environment}
                        />
                        <MetricInfoCard
                            icon={<ShieldCheck size={16} className="text-violet-300" />}
                            title="Request trace"
                            body={metrics.request_id}
                            mono
                        />
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                        <MetricInfoCard
                            icon={<ActivitySquare size={16} className="text-emerald-300" />}
                            title="Request volume"
                            body={`Total ${metrics.request_totals.total} • Failed ${metrics.request_totals.failed}`}
                        />
                        <MetricInfoCard
                            icon={<TimerReset size={16} className="text-amber-300" />}
                            title="Latency"
                            body={`Avg ${metrics.request_totals.average_duration_ms.toFixed(2)}ms • Max ${metrics.request_totals.max_duration_ms.toFixed(2)}ms`}
                        />
                        <MetricInfoCard
                            icon={<Link2 size={16} className="text-rose-300" />}
                            title="Last status"
                            body={`${metrics.request_totals.last_status_code} on ${metrics.request_totals.last_request_path}`}
                        />
                    </div>

                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Trend snapshot</div>
                            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                Window {metrics.telemetry_window.recent_request_limit} recent requests
                            </div>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-4">
                            {metrics.latency_trend.map((point) => (
                                <div key={point.label} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{point.label}</div>
                                    <div className="mt-2 text-lg font-semibold text-white">{point.average_duration_ms.toFixed(2)}ms</div>
                                    <div className="mt-1 text-sm text-zinc-300">{point.request_count} req • {point.failed_count} fail</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Top routes</div>
                        <div className="space-y-2">
                            {metrics.path_aggregates.slice(0, 5).map((aggregate) => (
                                <div key={aggregate.path} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-mono text-xs text-zinc-200 break-all">{aggregate.path}</div>
                                        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                            {aggregate.total_requests} hits
                                        </div>
                                    </div>
                                    <div className="mt-1 text-sm text-zinc-300">
                                        Avg {aggregate.average_duration_ms.toFixed(2)}ms • Max {aggregate.max_duration_ms.toFixed(2)}ms
                                    </div>
                                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                                        Failed {aggregate.failed_requests}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <MetricInfoCard
                        icon={<Link2 size={16} className="text-amber-300" />}
                        title="Scope"
                        body={metrics.project_id ? `Project: ${metrics.project_id}` : "Workspace-wide metrics"}
                    />

                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
                        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Recent requests</div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={requestSearch}
                                    onChange={(event) => setRequestSearch(event.target.value)}
                                    placeholder="Search path, request ID, or status"
                                    className="min-w-[240px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-600"
                                />
                                <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                                    {([
                                        ["all", "All"],
                                        ["ok", "OK"],
                                        ["failed", "Failed"],
                                    ] as const).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setStatusFilter(value)}
                                            className={statusFilter === value ? "rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white" : "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:text-zinc-300"}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredRequests.length > 0 ? filteredRequests.slice(0, requestLimit).map((request) => (
                                <div key={`${request.request_id}-${request.path}`} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-mono text-xs text-zinc-200 break-all">{request.request_id}</div>
                                        <span className={request.failed ? "text-xs font-semibold uppercase tracking-[0.18em] text-rose-300" : "text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"}>
                                            {request.status_code}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-sm text-zinc-300">{request.path}</div>
                                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                                        {request.duration_ms.toFixed(2)}ms {request.failed ? "• failed" : "• ok"}
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/50 px-4 py-6 text-sm text-zinc-500">
                                    No requests match the current filters.
                                </div>
                            )}
                        </div>
                        {filteredRequests.length > requestLimit ? (
                            <button
                                type="button"
                                onClick={() => setRequestLimit((current) => current + 8)}
                                className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                Show more
                            </button>
                        ) : null}
                    </div>
                </>
            ) : (
                <EmptyState message="No operator metrics available yet." />
            )}
        </SectionPanel>
    );
}

function MetricInfoCard({
    icon,
    title,
    body,
    mono = false,
}: {
    icon: ReactNode;
    title: string;
    body: string;
    mono?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {icon}
                {title}
            </div>
            <div className={mono ? "font-mono text-sm text-zinc-200 break-all" : "text-sm text-zinc-300"}>{body}</div>
        </div>
    );
}
