import { Handle, Position, type NodeProps } from "@xyflow/react";

interface GraphTaskNodeData {
    title: string;
    taskId: number;
    statusLabel: string;
    summary: string;
    nextStep: string;
    badgeClass: string;
    operationalLabel?: string;
    operationalClass?: string;
}

export function GraphTaskNode({ data, selected }: NodeProps) {
    const node = data as unknown as GraphTaskNodeData;
    const handleBaseClass = "!h-3 !w-3 !border-2 !border-zinc-950 shadow-[0_0_0_3px_rgba(9,9,11,0.85)]";

    return (
        <div
            className={`relative w-[220px] border bg-zinc-950/96 px-3 py-2.5 shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition ${selected ? "border-sky-400 ring-2 ring-sky-500/30" : "border-zinc-800/90"
                }`}
        >
            <Handle id="top-in" type="target" position={Position.Top} style={{ left: "34%", top: -6 }} className={`${handleBaseClass} !bg-sky-300`} />
            <Handle id="top-out" type="source" position={Position.Top} style={{ left: "66%", top: -6 }} className={`${handleBaseClass} !bg-sky-500`} />
            <Handle id="right-in" type="target" position={Position.Right} style={{ top: "34%", right: -6 }} className={`${handleBaseClass} !bg-sky-300`} />
            <Handle id="right-out" type="source" position={Position.Right} style={{ top: "66%", right: -6 }} className={`${handleBaseClass} !bg-sky-500`} />
            <Handle id="bottom-in" type="target" position={Position.Bottom} style={{ left: "34%", bottom: -6 }} className={`${handleBaseClass} !bg-sky-300`} />
            <Handle id="bottom-out" type="source" position={Position.Bottom} style={{ left: "66%", bottom: -6 }} className={`${handleBaseClass} !bg-sky-500`} />
            <Handle id="left-in" type="target" position={Position.Left} style={{ top: "34%", left: -6 }} className={`${handleBaseClass} !bg-sky-300`} />
            <Handle id="left-out" type="source" position={Position.Left} style={{ top: "66%", left: -6 }} className={`${handleBaseClass} !bg-sky-500`} />

            <div className="space-y-1.5 text-left">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="line-clamp-2 text-[13px] font-semibold leading-5 text-zinc-100">{node.title}</div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">Task #{node.taskId}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${node.badgeClass}`}>
                            {node.statusLabel}
                        </span>
                        {node.operationalLabel ? (
                            <span className={`border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${node.operationalClass}`}>
                                {node.operationalLabel}
                            </span>
                        ) : null}
                    </div>
                </div>
                <p className="line-clamp-2 text-[11px] leading-5 text-zinc-400">{node.summary}</p>
                <div className="line-clamp-2 text-[11px] leading-5 text-zinc-500">
                    Next: <span className="text-zinc-300">{node.nextStep}</span>
                </div>
            </div>
        </div>
    );
}
