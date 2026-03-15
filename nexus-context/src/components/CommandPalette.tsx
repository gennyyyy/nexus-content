import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Search, FileText, LayoutDashboard, Brain, Network, Plus, FolderSync, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTasks, fetchProjectsWithOptions, type Task, type Project } from "../lib/api";
import { appQueryKeys } from "../lib/queryKeys";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { projectId } = useParams();

    const tasksQuery = useQuery<Task[]>({
        queryKey: appQueryKeys.tasks.list(projectId),
        queryFn: () => fetchTasks(projectId),
        enabled: open,
    });

    const projectsQuery = useQuery<Project[]>({
        queryKey: appQueryKeys.projects.list(false),
        queryFn: () => fetchProjectsWithOptions(),
        enabled: open,
    });

    const tasks = tasksQuery.data ?? [];
    const projects = projectsQuery.data ?? [];

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Palette"
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm px-4"
        >
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden animate-fade-up">
                <div className="flex items-center border-b border-zinc-800 px-4">
                    <Search className="w-4 h-4 mr-3 text-zinc-500" />
                    <Command.Input
                        placeholder="Search tasks, projects, or actions..."
                        className="w-full h-12 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    <button 
                        onClick={() => setOpen(false)}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                    >
                        <X size={16} className="text-zinc-500" />
                    </button>
                </div>

                <Command.List className="max-h-[350px] overflow-y-auto p-2 nexus-scroll">
                    <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                        No results found.
                    </Command.Empty>

                    {projectId && (
                        <Command.Group heading={<span className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Project Navigation</span>}>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate(`/projects/${projectId}/control-center`))}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-default select-none aria-selected:bg-zinc-800 aria-selected:text-white"
                            >
                                <LayoutDashboard size={16} />
                                Control Center
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate(`/projects/${projectId}/workspace`))}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-default select-none aria-selected:bg-zinc-800 aria-selected:text-white"
                            >
                                <Network size={16} />
                                Task Workspace
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => navigate(`/projects/${projectId}/memory`))}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-default select-none aria-selected:bg-zinc-800 aria-selected:text-white"
                            >
                                <Brain size={16} />
                                Memory Hub
                            </Command.Item>
                        </Command.Group>
                    )}

                    <Command.Group heading={<span className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tasks</span>}>
                        {tasks.map((task) => (
                            <Command.Item
                                key={task.id}
                                onSelect={() => runCommand(() => navigate(`/projects/${projectId}/workspace?taskId=${task.id}`))}
                                className="flex items-center justify-between px-3 py-2 text-sm text-zinc-300 rounded cursor-default select-none aria-selected:bg-zinc-800 aria-selected:text-white"
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <FileText size={16} className="shrink-0" />
                                    <span className="truncate">{task.title}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 px-1.5 py-0.5 border border-zinc-800 rounded">
                                    #{task.id}
                                </span>
                            </Command.Item>
                        ))}
                    </Command.Group>

                    <Command.Group heading={<span className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Switch Projects</span>}>
                        {projects.map((project) => (
                            <Command.Item
                                key={project.id}
                                onSelect={() => runCommand(() => navigate(`/projects/${project.id}/control-center`))}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-default select-none aria-selected:bg-zinc-800 aria-selected:text-white"
                            >
                                <FolderSync size={16} />
                                {project.name}
                            </Command.Item>
                        ))}
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/projects"))}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 rounded cursor-default select-none aria-selected:bg-zinc-800 aria-selected:text-white"
                        >
                            <Plus size={16} />
                            Go to Project Selector
                        </Command.Item>
                    </Command.Group>
                </Command.List>

                <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 bg-zinc-900/30">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 font-sans">↑↓</kbd>
                            <span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 font-sans">Enter</kbd>
                            <span>Select</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 font-sans">Esc</kbd>
                            <span>Close</span>
                        </div>
                    </div>
                </div>
            </div>
        </Command.Dialog>
    );
}
