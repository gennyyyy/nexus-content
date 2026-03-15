import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Brain, Settings, Workflow, FolderGit2, Activity } from "lucide-react";
import { API_BASE, fetchProjects, type Project } from "../lib/api";
import { SettingsModal } from "./SettingsModal";
import { useUserSession } from "./user-session-context";

type McpStatus = "online" | "offline" | "checking";

function useMcpHealth(intervalMs = 15000): McpStatus {
    const [status, setStatus] = useState<McpStatus>("checking");

    useEffect(() => {
        let mounted = true;

        async function check() {
            try {
                const controller = new AbortController();
                const res = await fetch(`${API_BASE}/tasks`, { signal: controller.signal });
                // Abort immediately after status — we only need to check connectivity
                controller.abort();
                if (mounted) setStatus(res.ok ? "online" : "offline");
            } catch {
                if (mounted) setStatus("offline");
            }
        }

        void check();
        const timer = setInterval(check, intervalMs);
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [intervalMs]);

    return status;
}

const STATUS_CONFIG: Record<McpStatus, { dot: string; label: string; badge: string }> = {
    online: {
        dot: "bg-emerald-500 animate-pulse",
        label: "MCP Server",
        badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    },
    offline: {
        dot: "bg-rose-500",
        label: "MCP Server",
        badge: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    },
    checking: {
        dot: "bg-amber-500 animate-pulse",
        label: "MCP Server",
        badge: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    },
};

export function Sidebar() {
    const mcpStatus = useMcpHealth();
    const cfg = STATUS_CONFIG[mcpStatus];
    const { projectId } = useParams();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { session } = useUserSession();

    useEffect(() => {
        void fetchProjects().then(setProjects).catch(console.error);
    }, [session]);

    const currentProject = projects.find(p => p.id === projectId);

    return (
        <aside className="z-20 flex w-full shrink-0 flex-col border-b border-zinc-800/80 bg-zinc-950/92 text-zinc-100 backdrop-blur-xl lg:h-full lg:w-[260px] lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-4">
                <div className="flex h-8 w-8 items-center justify-center bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20 rounded">
                    <Activity size={16} className="text-sky-300" />
                </div>
                <div>
                    <div className="text-sm font-semibold tracking-tight text-white">Nexus Context</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Task & memory cockpit</div>
                </div>
            </div>

            <div className="border-b border-zinc-800/80 px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <FolderGit2 size={12} /> Project Context
                    </label>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-sky-400 transition-colors"
                        title="Switch Project"
                    >
                        <Settings size={10} />
                        Settings
                    </button>
                </div>
                <div className="mb-2 flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-400">
                    <span className="truncate font-semibold text-zinc-300">{session.userId}</span>
                    <span className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-bold text-sky-300">
                        {session.role}
                    </span>
                </div>
                <div 
                    onClick={() => setIsSettingsOpen(true)}
                    className="group w-full rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm font-medium text-zinc-200 cursor-pointer hover:bg-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between"
                >
                    <span className="truncate">{currentProject ? currentProject.name : "Loading..."}</span>
                    <FolderGit2 size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
            </div>

            <nav className="flex flex-1 gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible" aria-label="Main navigation">
                <NavLink
                    to={`/projects/${projectId}/control-center`}
                    className={({ isActive }) => `group flex min-w-[140px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        isActive 
                            ? 'bg-sky-500/10 text-sky-100 ring-1 ring-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                >
                    {({ isActive }) => (
                        <>
                            <Activity size={16} className={isActive ? "text-sky-400" : "text-zinc-500 group-hover:text-zinc-400"} />
                            <span>Control Center</span>
                        </>
                    )}
                </NavLink>
                <NavLink
                    to={`/projects/${projectId}/workspace`}
                    className={({ isActive }) => `group flex min-w-[140px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        isActive 
                            ? 'bg-sky-500/10 text-sky-100 ring-1 ring-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                >
                    {({ isActive }) => (
                        <>
                            <Workflow size={16} className={isActive ? "text-sky-400" : "text-zinc-500 group-hover:text-zinc-400"} />
                            <span>Workspace</span>
                        </>
                    )}
                </NavLink>
                <NavLink
                    to={`/projects/${projectId}/memory`}
                    className={({ isActive }) => `group flex min-w-[140px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        isActive 
                            ? 'bg-sky-500/10 text-sky-100 ring-1 ring-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                >
                    {({ isActive }) => (
                        <>
                            <Brain size={16} className={isActive ? "text-sky-400" : "text-zinc-500 group-hover:text-zinc-400"} />
                            <span>Memory Hub</span>
                        </>
                    )}
                </NavLink>
            </nav>
            
            <div className="flex flex-col gap-2 border-t border-zinc-800/80 px-4 py-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
                    <span>System Status</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50">
                    <span className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shadow-[0_0_8px_current] ${cfg.dot}`}></div>
                        {cfg.label}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${cfg.badge}`}>
                        {mcpStatus.toUpperCase()}
                    </span>
                </div>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </aside>
    );
}
