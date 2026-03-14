import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProjects, createProject, fetchControlCenterSnapshot, type Project, type ControlCenterSnapshot } from "../lib/api";
import { Server, Bot, FolderKanban, Plus, Cpu, Activity, Terminal } from "lucide-react";
import { cn } from "../lib/utils";

export function ProjectSelector() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [stats, setStats] = useState<ControlCenterSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectId, setNewProjectId] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [projectsData, statsData] = await Promise.all([
                fetchProjects(),
                fetchControlCenterSnapshot(null).catch(() => null) // Global stats if supported, or gracefully fail
            ]);
            setProjects(projectsData);
            if (statsData) setStats(statsData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault();
        if (!newProjectId || !newProjectName) return;

        try {
            await createProject({
                id: newProjectId,
                name: newProjectName,
                description: `Project ${newProjectName}`
            });
            setIsCreating(false);
            setNewProjectId("");
            setNewProjectName("");
            loadData();
        } catch (error) {
            console.error("Failed to create project", error);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 font-mono text-sm tracking-widest text-zinc-500 uppercase">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="animate-pulse text-blue-500" size={24} />
                    Initializing Nexus Core...
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200">
            {/* Left Sidebar: System Diagnostics */}
            <aside className="w-80 shrink-0 border-r border-zinc-800/80 bg-zinc-950/50 flex flex-col hidden lg:flex">
                <div className="p-6 border-b border-zinc-800/80">
                    <div className="flex items-center gap-3 font-mono text-sm tracking-widest text-zinc-300 uppercase mb-1">
                        <Terminal size={16} className="text-blue-500" />
                        Nexus Context
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">
                        System Diagnostics
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-8">
                    {/* MCP Server Node */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                            <Server size={14} className="text-blue-400" />
                            MCP Server Node
                        </h3>
                        <div className="border border-zinc-800 bg-zinc-900/30 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Status</span>
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border",
                                    stats?.server.status === "online" 
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                        : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                )}>
                                    {stats?.server.status || "UNKNOWN"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Transport</span>
                                <span className="text-xs font-mono text-zinc-300">{stats?.server.transport || "SSE"}</span>
                            </div>
                            <div className="pt-2 border-t border-zinc-800/50">
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">SSE Endpoint</div>
                                <div className="truncate text-xs font-mono text-blue-400 bg-blue-500/5 px-2 py-1 border border-blue-500/20">
                                    {stats?.server.sse_url || "http://localhost:8000/mcp/sse"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Discord Bridge */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                            <Bot size={14} className="text-indigo-400" />
                            Discord Bridge
                        </h3>
                        <div className="border border-zinc-800 bg-zinc-900/30 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Service</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400">
                                    STANDALONE
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                The Discord bot runs as a separate Node.js process. Ensure it is started via `npm run dev` in the discord-bot directory.
                            </p>
                        </div>
                    </div>

                    {/* Global Metrics */}
                    {stats && (
                        <div>
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                                <Cpu size={14} className="text-emerald-400" />
                                Global Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="border border-zinc-800 bg-zinc-900/30 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Total Tasks</div>
                                    <div className="text-xl font-mono text-zinc-100">{stats.total_tasks}</div>
                                </div>
                                <div className="border border-zinc-800 bg-zinc-900/30 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Active</div>
                                    <div className="text-xl font-mono text-blue-400">{stats.in_progress_count}</div>
                                </div>
                                <div className="border border-zinc-800 bg-zinc-900/30 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Ready</div>
                                    <div className="text-xl font-mono text-emerald-400">{stats.ready_count}</div>
                                </div>
                                <div className="border border-zinc-800 bg-zinc-900/30 p-3">
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Blocked</div>
                                    <div className="text-xl font-mono text-rose-400">{stats.blocked_count}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content: Projects Grid */}
            <main className="flex-1 flex flex-col">
                <header className="px-8 py-10 border-b border-zinc-800/60 bg-zinc-900/20">
                    <div className="max-w-5xl mx-auto">
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workspaces</h1>
                        <p className="text-zinc-400 max-w-2xl text-sm">
                            Select a project to access its Control Center, Kanban Board, and Task Graph. Each project maintains isolated memory and dependencies for the AI agents.
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950 to-zinc-950">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    to={`/projects/${project.id}/control-center`}
                                    className="group flex flex-col border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:border-blue-500/50 hover:bg-zinc-900"
                                >
                                    <div className="flex-1 mb-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="p-2 bg-zinc-950 border border-zinc-800 group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-colors">
                                                <FolderKanban size={18} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                            </div>
                                            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-950 px-1.5 py-0.5 border border-zinc-800/60">
                                                ID: {project.id}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-blue-400 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                                            {project.description || "No description provided."}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold group-hover:text-blue-400 transition-colors mt-auto pt-4 border-t border-zinc-800/60">
                                        Open Workspace <span className="font-mono ml-auto">→</span>
                                    </div>
                                </Link>
                            ))}

                            <button
                                onClick={() => setIsCreating(true)}
                                className="group flex min-h-[220px] flex-col items-center justify-center border border-dashed border-zinc-700 bg-transparent p-6 text-zinc-400 transition-all hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-400"
                            >
                                <div className="p-3 bg-zinc-900 border border-zinc-800 mb-4 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors">
                                    <Plus size={24} />
                                </div>
                                <span className="text-sm font-semibold tracking-wider uppercase">Initialize Project</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Create Project Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 shadow-2xl">
                        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Initialize Project</h2>
                            <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateProject} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                                    Project ID <span className="text-zinc-600 normal-case tracking-normal font-normal">(unique, lowercase, no spaces)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newProjectId}
                                    onChange={(e) => setNewProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    className="block w-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                                    placeholder="e.g. core-platform"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="block w-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                                    placeholder="e.g. Core Platform"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800/60 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors border border-transparent"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 transition-colors border border-blue-500 flex items-center gap-2"
                                >
                                    <Plus size={14} /> Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
