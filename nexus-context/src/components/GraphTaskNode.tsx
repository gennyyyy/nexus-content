import { Handle, Position, type NodeProps } from "@xyflow/react";

interface GraphTaskNodeData {
    title: string;
    taskId: number;
    statusLabel: string;
    summary: string;
    nextStep: string;
    badgeClass: string;
}

export function GraphTaskNode({ data, selected }: NodeProps) {
    const node = data as unknown as GraphTaskNodeData;

    return (
        <div
            className={`relative w-[280px] rounded-2xl border bg-zinc-950/95 p-4 shadow-2xl transition ${
                selected ? "border-blue-400 ring-2 ring-blue-500/40" : "border-zinc-800"
            }`}
        >
            <Handle id="top-in" type="target" position={Position.Top} style={{ left: "42%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-300" />
            <Handle id="top-out" type="source" position={Position.Top} style={{ left: "58%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-500" />
            <Handle id="right-in" type="target" position={Position.Right} style={{ top: "42%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-300" />
            <Handle id="right-out" type="source" position={Position.Right} style={{ top: "58%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-500" />
            <Handle id="bottom-in" type="target" position={Position.Bottom} style={{ left: "42%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-300" />
            <Handle id="bottom-out" type="source" position={Position.Bottom} style={{ left: "58%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-500" />
            <Handle id="left-in" type="target" position={Position.Left} style={{ top: "42%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-300" />
            <Handle id="left-out" type="source" position={Position.Left} style={{ top: "58%" }} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-500" />

            <div className="space-y-3 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-100">{node.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">Task #{node.taskId}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${node.badgeClass}`}>
                        {node.statusLabel}
                    </span>
                </div>
                <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{node.summary}</p>
                <div className="text-[11px] text-zinc-500">
                    Next: <span className="text-zinc-300">{node.nextStep}</span>
                </div>
            </div>
        </div>
    );
}
