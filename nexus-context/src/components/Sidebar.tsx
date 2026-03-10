import { NavLink } from "react-router-dom";
import { Brain, Settings, Workflow } from "lucide-react";

export function Sidebar() {
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
            <nav className="flex flex-1 gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
                <NavLink
                    to="/"
                    className={({ isActive }) => `flex min-w-[140px] items-center gap-3 px-3 py-2.5 transition-all font-medium text-sm ${isActive ? 'bg-sky-500/12 text-white ring-1 ring-sky-400/25' : 'text-zinc-400 hover:bg-zinc-800/45 hover:text-white'}`}
                >
                    <Workflow size={16} />
                    <span>Workspace</span>
                </NavLink>
                <NavLink
                    to="/memory"
                    className={({ isActive }) => `flex min-w-[140px] items-center gap-3 px-3 py-2.5 transition-all font-medium text-sm ${isActive ? 'bg-sky-500/12 text-white ring-1 ring-sky-400/25' : 'text-zinc-400 hover:bg-zinc-800/45 hover:text-white'}`}
                >
                    <Brain size={16} />
                    <span>Memory Hub</span>
                </NavLink>
            </nav>
            <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-3 text-xs text-zinc-500">
                <span className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    MCP Server
                </span>
                <span className="border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-200">ONLINE</span>
            </div>
        </aside>
    );
}
