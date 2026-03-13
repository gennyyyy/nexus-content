import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { FolderGit2, X, Plus } from "lucide-react";
import { fetchProjects, createProject, type Project } from "../lib/api";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectId, setNewProjectId] = useState("");
    const navigate = useNavigate();
    const { projectId } = useParams();

    useEffect(() => {
        if (isOpen) {
            void loadProjects();
        }
    }, [isOpen]);

    async function loadProjects() {
        setIsLoading(true);
        try {
            const data = await fetchProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault();
        if (!newProjectId || !newProjectName) return;

        try {
            const created = await createProject({
                id: newProjectId,
                name: newProjectName,
                description: `Project ${newProjectName}`
            });
            setIsCreating(false);
            setNewProjectId("");
            setNewProjectName("");
            await loadProjects();
            navigate(`/projects/${created.id}/control-center`);
            onClose();
        } catch (error) {
            console.error("Failed to create project", error);
        }
    }

    function handleSwitchProject(id: string) {
        navigate(`/projects/${id}/control-center`);
        onClose();
    }

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-fade-up">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                    <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <FolderGit2 size={16} className="text-zinc-500" />
                        Project Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                Available Projects
                            </h3>
                            {!isCreating && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="flex items-center gap-1.5 text-[10px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                                >
                                    <Plus size={12} /> NEW PROJECT
                                </button>
                            )}
                        </div>
                        
                        {isCreating && (
                            <form onSubmit={handleCreateProject} className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3 animate-fade-in">
                                <div>
                                    <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
                                        Project ID
                                    </label>
                                    <input
                                        type="text"
                                        value={newProjectId}
                                        onChange={(e) => setNewProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                        className="block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none transition-all"
                                        placeholder="e.g. core-platform"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
                                        Project Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        className="block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none transition-all"
                                        placeholder="e.g. Core Platform"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded bg-sky-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/20"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        )}

                        {isLoading ? (
                            <div className="space-y-2">
                                <div className="h-10 w-full animate-pulse rounded bg-zinc-800/50" />
                                <div className="h-10 w-full animate-pulse rounded bg-zinc-800/50" />
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto nexus-scroll pr-1">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className={`group flex items-center justify-between rounded-lg border p-3 transition-all ${
                                            project.id === projectId
                                                ? "border-sky-500/30 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)]"
                                                : "border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-800/40"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                                                project.id === projectId 
                                                    ? "border-sky-500/30 bg-sky-500/20 text-sky-300" 
                                                    : "border-zinc-800 bg-zinc-900 text-zinc-500 group-hover:text-zinc-400"
                                            }`}>
                                                <FolderGit2 size={14} />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium ${project.id === projectId ? "text-sky-100" : "text-zinc-300 group-hover:text-zinc-200"}`}>
                                                    {project.name}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-mono tracking-tight">ID: {project.id}</div>
                                            </div>
                                        </div>
                                        
                                        {project.id !== projectId ? (
                                            <button
                                                onClick={() => handleSwitchProject(project.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                            >
                                                Switch
                                            </button>
                                        ) : (
                                            <span className="flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400 border border-sky-500/20">
                                                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                                                Active
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
