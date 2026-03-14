import { useCallback, useEffect, useRef, useState } from "react";
import { useEdgesState, useNodesState, type Edge, type Node, type NodeChange } from "@xyflow/react";
import { buildEdges, buildNodes, computeAutoLayout } from "../utils";
import { NODE_POSITIONS_KEY } from "../constants";
import type { PositionMap } from "../types";
import type { Task, TaskDependency, TaskMemorySummary, TaskOperationalState } from "../../../lib/api";

export function useWorkspaceGraph() {
    const [nodePositions, setNodePositions] = useState<PositionMap>(() => {
        if (typeof window === "undefined") return {};
        try {
            return JSON.parse(window.localStorage.getItem(NODE_POSITIONS_KEY) || "{}") as PositionMap;
        } catch {
            return {};
        }
    });

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    
    const nodePositionsRef = useRef(nodePositions);

    useEffect(() => {
        nodePositionsRef.current = nodePositions;
        if (typeof window !== "undefined") {
            window.localStorage.setItem(NODE_POSITIONS_KEY, JSON.stringify(nodePositions));
        }
    }, [nodePositions]);

    const handleGraphNodesChange = useCallback((changes: NodeChange<Node>[]) => {
        onNodesChange(changes);
        setNodePositions((current) => {
            const next = { ...current };
            for (const change of changes) {
                if (change.type === "position" && change.position) {
                    next[change.id] = change.position;
                }
            }
            return next;
        });
    }, [onNodesChange]);

    const handleAutoArrange = useCallback((tasks: Task[], dependencies: TaskDependency[]) => {
        const nextPositions = computeAutoLayout(tasks, dependencies);
        setNodePositions(nextPositions);
        setNodes((current) => current.map((node) => ({ ...node, position: nextPositions[node.id] || node.position })));
    }, [setNodes]);

    const syncGraph = useCallback((
        tasks: Task[], 
        dependencies: TaskDependency[], 
        memoryByTask: Map<number, TaskMemorySummary>, 
        operationalByTask: Map<number, TaskOperationalState>
    ) => {
        setNodes(buildNodes(tasks, memoryByTask, operationalByTask, nodePositionsRef.current));
        setEdges(buildEdges(dependencies));
    }, [setNodes, setEdges]);

    return {
        nodes,
        edges,
        setNodes,
        setEdges,
        onNodesChange: handleGraphNodesChange,
        onEdgesChange,
        handleAutoArrange,
        syncGraph,
        setNodePositions
    };
}
