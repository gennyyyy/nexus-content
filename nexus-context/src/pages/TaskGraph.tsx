import { useCallback, useEffect, useState } from "react";
import {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlow,
    addEdge,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import type { Connection, Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { fetchDependencies, fetchTasks, type Task } from "../lib/api";
import { TaskContextModal } from "../components/TaskContextModal";

type GraphNodeData = { label: string };

export function TaskGraph() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const loadGraph = useCallback(async () => {
        try {
            const [tasksData, dependencies] = await Promise.all([fetchTasks(), fetchDependencies()]);
            setTasks(tasksData);

            const nextNodes: Node<GraphNodeData>[] = tasksData.map((task, index) => ({
                id: String(task.id),
                position: { x: (index % 3) * 300 + 50, y: Math.floor(index / 3) * 150 + 50 },
                data: { label: task.title },
                style: {
                    background: "#09090b",
                    color: "#f4f4f5",
                    border: task.status === "done" ? "1px solid #10b981" : "1px solid #27272a",
                    borderRadius: "8px",
                    padding: "16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    width: 220,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                },
            }));

            const nextEdges: Edge[] = dependencies.map((dependency) => ({
                id: `e${dependency.source_task_id}-${dependency.target_task_id}`,
                source: String(dependency.source_task_id),
                target: String(dependency.target_task_id),
                animated: true,
                label: dependency.type,
                labelStyle: { fill: "#a1a1aa", fontWeight: 600 },
                style: { stroke: "#3b82f6", strokeWidth: 2 },
            }));

            setNodes(nextNodes);
            setEdges(nextEdges);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [setEdges, setNodes]);

    useEffect(() => {
        void loadGraph();
    }, [loadGraph]);

    const onConnect = useCallback((params: Connection | Edge) => {
        setEdges((current) =>
            addEdge(
                {
                    ...params,
                    animated: true,
                },
                current,
            ),
        );
    }, [setEdges]);

    if (loading) {
        return <div className="p-8 text-zinc-400 animate-pulse">Loading graph...</div>;
    }

    return (
        <div className="flex h-full flex-col p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Dependency Graph</h1>
                    <p className="text-sm text-zinc-400">
                        Visualize relationships, connect tasks, and open AI context from the graph.
                    </p>
                </div>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950 shadow-xl">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    colorMode="dark"
                    fitView
                    onNodeClick={(_, node) => {
                        const task = tasks.find((item) => String(item.id) === node.id);
                        if (task) setSelectedTask(task);
                    }}
                >
                    <Controls className="bg-zinc-900 border-zinc-800 fill-white" />
                    <MiniMap
                        nodeColor="#27272a"
                        maskColor="rgba(0, 0, 0, 0.7)"
                        className="rounded-md border border-zinc-800 bg-zinc-950"
                    />
                    <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#27272a" />
                </ReactFlow>
            </div>

            <TaskContextModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </div>
    );
}
