import { useEffect, useState, useCallback } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    BackgroundVariant
} from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { type Task, fetchTasks, fetchDependencies } from '../lib/api';
import { TaskContextModal } from '../components/TaskContextModal';

export function TaskGraph() {
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        loadGraph();
    }, []);

    async function loadGraph() {
        try {
            const tasksData = await fetchTasks();
            const deps = await fetchDependencies();
            setTasks(tasksData);

            const newNodes: any = tasksData.map((t, i) => ({
                id: t.id!.toString(),
                position: { x: (i % 3) * 300 + 50, y: Math.floor(i / 3) * 150 + 50 },
                data: { label: t.title },
                style: {
                    background: '#09090b', // zinc-950
                    color: '#f4f4f5', // zinc-50
                    border: t.status === 'done' ? '1px solid #10b981' : '1px solid #27272a', // zinc-800
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    width: 220,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }
            }));

            const newEdges: any = deps.map(d => ({
                id: `e${d.source_task_id}-${d.target_task_id}`,
                source: d.source_task_id.toString(),
                target: d.target_task_id.toString(),
                animated: true,
                label: d.type,
                labelStyle: { fill: '#a1a1aa', fontWeight: 600 }, // zinc-400
                style: { stroke: '#3b82f6', strokeWidth: 2 } // blue-500
            }));

            setNodes(newNodes);
            setEdges(newEdges);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const onConnect = useCallback((params: Connection | Edge) => {
        setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds));
    }, [setEdges]);

    if (loading) {
        return <div className="p-8 text-zinc-400 animate-pulse">Loading graph...</div>;
    }

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dependency Graph</h1>
                    <p className="text-zinc-400 text-sm">Visualize relationships. Connect tasks to mark dependencies (`Task A blocks Task B`). Click nodes to view AI Context.</p>
                </div>
            </div>
            <div className="flex-1 border border-zinc-800/60 bg-zinc-950 relative rounded-xl shadow-xl overflow-hidden cursor-pointer">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    colorMode="dark"
                    fitView
                    onNodeClick={(_, node) => {
                        const task = tasks.find(t => t.id?.toString() === node.id);
                        if (task) setSelectedTask(task);
                    }}
                >
                    <Controls className="bg-zinc-900 border-zinc-800 fill-white" />
                    <MiniMap
                        nodeColor="#27272a"
                        maskColor="rgba(0, 0, 0, 0.7)"
                        className="bg-zinc-950 border border-zinc-800 rounded-md"
                    />
                    <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#27272a" />
                </ReactFlow>
            </div>

            <TaskContextModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </div>
    );
}
