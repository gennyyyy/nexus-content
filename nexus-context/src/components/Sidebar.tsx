import { NavLink } from "react-router-dom";
import { Brain, Settings, Workflow } from "lucide-react";

export function Sidebar() {
    return (
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full text-zinc-100">
            <div className="p-6 font-bold text-xl tracking-tight border-b border-zinc-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                    <Settings size={14} className="text-white" />
                </div>
                Nexus Context
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <NavLink
                    to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 font-medium ${isActive ? 'bg-zinc-800/80 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                    <Workflow size={18} />
                    <span>Workspace</span>
                </NavLink>
                <NavLink
                    to="/memory"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 font-medium ${isActive ? 'bg-zinc-800/80 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                    <Brain size={18} />
                    <span>Memory Hub</span>
                </NavLink>
            </nav>
            <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    MCP Server
                </span>
                <span className="bg-zinc-800 px-2 py-1 rounded text-[10px] font-bold tracking-wider">ONLINE</span>
            </div>
        </aside>
    );
}
