import { Handle, Position, type NodeProps } from "@xyflow/react";

interface GraphTaskNodeData {
    title: string;
    taskId: number;
    statusLabel: string;
    statusColor: string;
    summary: string;
    nextStep: string;
    badgeClass: string;
    operationalLabel?: string;
    operationalClass?: string;
    priorityLabel: string;
    priorityClass: string;
    blockerCount: number;
    downstreamCount: number;
    isHot?: boolean;
}

export function GraphTaskNode({ data, selected }: NodeProps) {
    const node = data as unknown as GraphTaskNodeData;
    const handleBaseClass =
        "!h-3.5 !w-3.5 !border-[3px] !border-zinc-950 shadow-[0_0_0_4px_rgba(9,9,11,0.88)]";

    return (
        <div
            className={`relative w-[246px] overflow-visible rounded-[24px] border bg-zinc-900/40 backdrop-blur-md transition-all duration-200 ${selected
                    ? "border-sky-400 shadow-[0_24px_65px_rgba(14,165,233,0.16)] ring-2 ring-sky-500/25"
                    : node.isHot
                        ? "border-rose-500/50 shadow-[inset_0_0_20px_rgba(225,29,72,0.15)]"
                        : "border-zinc-800/90 shadow-[0_18px_45px_rgba(2,6,23,0.42)]"
                }`}
        >
            <div
                className="pointer-events-none absolute inset-0 rounded-[24px] opacity-90"
                style={{ background: `radial-gradient(circle at top left, ${node.statusColor}24, transparent 46%)` }}
            />
            <div
                className="pointer-events-none absolute inset-x-5 top-0 h-px opacity-90"
                style={{ background: `linear-gradient(90deg, transparent, ${node.statusColor}, transparent)` }}
            />

            <Handle
                id="top-in"
                type="target"
                position={Position.Top}
                style={{ left: "34%", top: -7 }}
                className={`${handleBaseClass} !bg-sky-300`}
            />
            <Handle
                id="top-out"
                type="source"
                position={Position.Top}
                style={{ left: "66%", top: -7 }}
                className={`${handleBaseClass} !bg-sky-500`}
            />
            <Handle
                id="right-in"
                type="target"
                position={Position.Right}
                style={{ top: "34%", right: -7 }}
                className={`${handleBaseClass} !bg-sky-300`}
            />
            <Handle
                id="right-out"
                type="source"
                position={Position.Right}
                style={{ top: "66%", right: -7 }}
                className={`${handleBaseClass} !bg-sky-500`}
            />
            <Handle
                id="bottom-in"
                type="target"
                position={Position.Bottom}
                style={{ left: "34%", bottom: -7 }}
                className={`${handleBaseClass} !bg-sky-300`}
            />
            <Handle
                id="bottom-out"
                type="source"
                position={Position.Bottom}
                style={{ left: "66%", bottom: -7 }}
                className={`${handleBaseClass} !bg-sky-500`}
            />
            <Handle
                id="left-in"
                type="target"
                position={Position.Left}
                style={{ top: "34%", left: -7 }}
                className={`${handleBaseClass} !bg-sky-300`}
            />
            <Handle
                id="left-out"
                type="source"
                position={Position.Left}
                style={{ top: "66%", left: -7 }}
                className={`${handleBaseClass} !bg-sky-500`}
            />

            <div className="relative space-y-3 p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex rounded-full border border-zinc-800 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Task #{node.taskId}
                        </div>
                        <div className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-zinc-50">
                            {node.title}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${node.badgeClass}`}
                        >
                            {node.statusLabel}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <span
                        className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${node.priorityClass}`}
                    >
                        {node.priorityLabel}
                    </span>
                    {node.operationalLabel ? (
                        <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${node.operationalClass}`}
                        >
                            {node.operationalLabel}
                        </span>
                    ) : null}
                </div>

                <div className="rounded-[18px] border border-zinc-800/90 bg-black/20 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Summary</div>
                    <p className="line-clamp-3 text-[11px] leading-5 text-zinc-300">{node.summary}</p>
                </div>

                <div className="rounded-[18px] border border-white/5 bg-zinc-900/40 backdrop-blur-sm p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Next Up</div>
                    <p className="line-clamp-2 text-[11px] leading-5 text-zinc-300">{node.nextStep}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <NodeMetric label="Blockers" value={node.blockerCount} />
                    <NodeMetric label="Downstream" value={node.downstreamCount} />
                </div>
            </div>
        </div>
    );
}

function NodeMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-zinc-100">{value}</div>
        </div>
    );
}
