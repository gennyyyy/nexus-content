import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { type Task, fetchTasks, updateTask, createTask } from "../lib/api";
import { Plus, GripVertical } from "lucide-react";
import { TaskContextModal } from "../components/TaskContextModal";

const COLUMNS = [
    { id: "todo", title: "To Do", bg: "bg-zinc-900/40 border-zinc-800/60" },
    { id: "in_progress", title: "In Progress", bg: "bg-blue-900/10 border-blue-900/30" },
    { id: "done", title: "Done", bg: "bg-emerald-900/10 border-emerald-900/30" },
] as const;

export function KanbanBoard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        loadTasks();
    }, []);

    async function loadTasks() {
        try {
            const data = await fetchTasks();
            setTasks(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleDragEnd(result: DropResult) {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;
        if (source.droppableId === destination.droppableId) return;

        // Optimistic UI update
        const taskId = parseInt(draggableId, 10);
        const newStatus = destination.droppableId as Task["status"];

        setTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        );

        // Backend update
        try {
            await updateTask(taskId, { status: newStatus });
        } catch (e) {
            console.error("Failed to update task", e);
            loadTasks(); // Revert on failure
        }
    }

    async function handleCreateTask(e: React.FormEvent) {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            const t = await createTask({ title: newTaskTitle, status: "todo" });
            setTasks(prev => [...prev, t]);
            setNewTaskTitle("");
        } catch (e) {
            console.error(e);
        }
    }

    if (loading) {
        return <div className="p-8 text-zinc-400 animate-pulse">Loading board...</div>;
    }

    return (
        <div className="p-8 h-full flex flex-col relative">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Kanban Board</h1>
                    <p className="text-zinc-400 text-sm">Manage tasks visually and update status via drag and drop.</p>
                </div>

                <form onSubmit={handleCreateTask} className="flex gap-2">
                    <input
                        type="text"
                        placeholder="New task title..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                    />
                    <button type="submit" className="bg-white text-black px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-zinc-200 transition-colors">
                        <Plus size={16} /> Add
                    </button>
                </form>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                    {COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id);
                        return (
                            <div key={col.id} className={`flex flex-col w-80 shrink-0 rounded-xl border backdrop-blur-sm ${col.bg}`}>
                                <div className="p-4 border-b border-inherit bg-black/20 flex items-center justify-between rounded-t-xl">
                                    <h3 className="font-semibold text-zinc-200">{col.title}</h3>
                                    <span className="text-xs bg-black/40 text-zinc-400 px-2 py-1 rounded-full">{colTasks.length}</span>
                                </div>

                                <Droppable droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 p-3 flex flex-col gap-3 transition-colors ${snapshot.isDraggingOver ? 'bg-black/10' : ''}`}
                                        >
                                            {colTasks.map((t, index) => (
                                                <Draggable key={t.id!.toString()} draggableId={t.id!.toString()} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 group transition-all cursor-pointer
                                ${snapshot.isDragging ? 'shadow-2xl shadow-black ring-2 ring-blue-500/50 scale-105 z-50' : 'hover:border-zinc-700 hover:shadow-lg'}
                              `}
                                                            onClick={() => setSelectedTask(t)}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div {...provided.dragHandleProps} className="text-zinc-600 hover:text-zinc-300 mt-0.5 cursor-grab active:cursor-grabbing">
                                                                    <GripVertical size={16} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-zinc-200 text-sm font-medium leading-snug mb-1.5">{t.title}</p>
                                                                    {t.description && <p className="text-xs text-zinc-500 line-clamp-2">{t.description}</p>}
                                                                    <div className="mt-3 flex items-center text-[10px] text-zinc-600 tracking-wider font-medium uppercase">
                                                                        ID: {t.id}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>

            <TaskContextModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        </div>
    );
}
