import type { FormEvent } from "react";
import { Filter, LayoutDashboard, Network, Plus } from "lucide-react";
import type { Task } from "../../lib/api";
import { DEPENDENCY_TYPES, type DependencyType } from "./constants";
import type { WorkspaceCounts, WorkspaceMode } from "./types";

interface Props {
    workspaceMode: WorkspaceMode;
    counts: WorkspaceCounts;
    newTaskTitle: string;
    statusFilter: "all" | Task["status"];
    operationalFilter: "all" | "ready" | "blocked" | "active";
    hideDone: boolean;
    search: string;
    dependencyType: DependencyType;
    onWorkspaceModeChange: (mode: WorkspaceMode) => void;
    onNewTaskTitleChange: (value: string) => void;
    onCreateTask: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
    onStatusFilterChange: (value: "all" | Task["status"]) => void;
    onOperationalFilterChange: (value: "all" | "ready" | "blocked" | "active") => void;
    onHideDoneChange: (value: boolean) => void;
    onSearchChange: (value: string) => void;
    onDependencyTypeChange: (value: DependencyType) => void;
    onAutoArrange: () => void;
}

export function WorkspaceHeader({
    workspaceMode,
    counts,
    newTaskTitle,
    statusFilter,
    operationalFilter,
    hideDone,
    search,
    dependencyType,
    onWorkspaceModeChange,
    onNewTaskTitleChange,
    onCreateTask,
    onStatusFilterChange,
    onOperationalFilterChange,
    onHideDoneChange,
    onSearchChange,
    onDependencyTypeChange,
    onAutoArrange,
}: Props) {
    return (
        <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 px-5 py-3 sm:px-6 lg:px-8">
                {/* Row 1: Title + inline metrics + mode toggle */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
                            Nexus Context
                        </h1>
                        <div className="hidden items-center gap-3 sm:flex">
                            <Chip label="To Do" value={counts.todo} />
                            <Chip label="Active" value={counts.in_progress} />
                            <Chip label="Done" value={counts.done} />
                            <Chip label="Ready" value={counts.ready} accent="emerald" />
                            <Chip label="Blocked" value={counts.blocked} accent="rose" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 border border-zinc-800 bg-zinc-950 p-1">
                        <ModeBtn
                            active={workspaceMode === "easy"}
                            icon={<LayoutDashboard size={14} />}
                            label="Easy"
                            onClick={() => onWorkspaceModeChange("easy")}
                        />
                        <ModeBtn
                            active={workspaceMode === "advanced"}
                            icon={<Network size={14} />}
                            label="Advanced"
                            onClick={() => onWorkspaceModeChange("advanced")}
                        />
                    </div>
                </div>

                {/* Row 2: Create task + all filters inline */}
                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={onCreateTask} className="flex items-center gap-2">
                        <input
                            value={newTaskTitle}
                            onChange={(event) => onNewTaskTitleChange(event.target.value)}
                            placeholder="Create a new task..."
                            className="w-56 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-600"
                        />
                        <button className="inline-flex items-center gap-1.5 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white">
                            <Plus size={14} /> Create
                        </button>
                    </form>

                    <div className="mx-1 h-5 w-px bg-zinc-800" />

                    <div className="relative">
                        <Filter size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search..."
                            className="w-44 border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-600"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) => onStatusFilterChange(event.target.value as "all" | Task["status"])}
                        className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                    >
                        <option value="all">All statuses</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>

                    <select
                        value={operationalFilter}
                        onChange={(event) => onOperationalFilterChange(event.target.value as "all" | "ready" | "blocked" | "active")}
                        className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                    >
                        <option value="all">All flow states</option>
                        <option value="ready">Ready</option>
                        <option value="blocked">Blocked</option>
                        <option value="active">Active</option>
                    </select>

                    <label className="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                        <input type="checkbox" checked={hideDone} onChange={(event) => onHideDoneChange(event.target.checked)} />
                        Hide done
                    </label>

                    <div className="mx-1 h-5 w-px bg-zinc-800" />

                    <select
                        value={dependencyType}
                        onChange={(event) => onDependencyTypeChange(event.target.value as DependencyType)}
                        className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                    >
                        {DEPENDENCY_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={onAutoArrange}
                        className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900"
                    >
                        Auto Arrange
                    </button>
                </div>
            </div>
        </header>
    );
}

function Chip({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "rose" }) {
    const colorClass = accent === "emerald"
        ? "text-emerald-300"
        : accent === "rose"
            ? "text-rose-300"
            : "text-zinc-100";

    return (
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            {label}
            <span className={`font-semibold tabular-nums ${colorClass}`}>{value}</span>
        </span>
    );
}

function ModeBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${active ? "bg-zinc-50 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"}`}
        >
            {icon}
            {label}
        </button>
    );
}
