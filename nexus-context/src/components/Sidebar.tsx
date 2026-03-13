import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { Brain, Settings, Workflow, FolderGit2 } from "lucide-react";
import { API_BASE, fetchProjects } from "../lib/api";

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
    const [searchParams, setSearchParams] = useSearchParams();
    const currentProject = searchParams.get("project") || "";
    const [projects, setProjects] = useState<string[]>([]);

    useEffect(() => {
        void fetchProjects().then(setProjects).catch(console.error);
    }, []);

    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            setSearchParams({ project: val });
        } else {
            setSearchParams({});
        }
    };

    return (
        <aside className="z-20 flex w-full shrink-0 flex-col border-b border-zinc-800/80 bg-zinc-950/92 text-zinc-100 backdrop-blur-xl lg:h-full lg:w-[260px] lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-4">
                <div className="flex h-8 w-8 items-center justify-center bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20">
                    <Settings size={14} className="text-white" />
                </div>
                <div>
                    <div className="text-sm font-semibold tracking-tight">Nexus Context</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Task & memory cockpit</div>
                </div>
            </div>

            <div className="border-b border-zinc-800/80 px-4 py-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    <FolderGit2 size={12} /> Workspace Context
                </label>
                <select
                    value={currentProject}
                    onChange={handleProjectChange}
                    className="w-full rounded border border-zinc-700 bg-zinc-900/40 backdrop-blur-md px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50"
                >
                    <option value="">Global (All Projects)</option>
                    {projects.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            <nav className="flex flex-1 gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible" aria-label="Main navigation">
                <NavLink
                    to="/"
                    className={({ isActive }) => `flex min-w-[140px] items-center gap-3 px-3 py-2.5 transition-all font-medium text-sm ${isActive ? 'bg-sky-500/12 text-white ring-1 ring-sky-400/25' : 'text-zinc-400 hover:bg-zinc-800/45 hover:text-white'}`}
                    aria-label="Workspace"
                >
                    <Workflow size={16} />
                    <span>Workspace</span>
                </NavLink>
                <NavLink
                    to="/memory"
                    className={({ isActive }) => `flex min-w-[140px] items-center gap-3 px-3 py-2.5 transition-all font-medium text-sm ${isActive ? 'bg-sky-500/12 text-white ring-1 ring-sky-400/25' : 'text-zinc-400 hover:bg-zinc-800/45 hover:text-white'}`}
                    aria-label="Memory Hub"
                >
                    <Brain size={16} />
                    <span>Memory Hub</span>
                </NavLink>
            </nav>
            <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-3 text-xs text-zinc-500">
                <span className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cfg.dot}`}></div>
                    {cfg.label}
                </span>
                <span className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${cfg.badge}`}>
                    {mcpStatus.toUpperCase()}
                </span>
            </div>
        </aside>
    );
}
