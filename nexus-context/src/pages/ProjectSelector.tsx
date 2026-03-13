import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProjects, createProject, type Project } from "../lib/api";

export function ProjectSelector() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectId, setNewProjectId] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
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
            await createProject({
                id: newProjectId,
                name: newProjectName,
                description: `Project ${newProjectName}`
            });
            setIsCreating(false);
            setNewProjectId("");
            setNewProjectName("");
            loadProjects();
        } catch (error) {
            console.error("Failed to create project", error);
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
                Loading projects...
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-950 p-8 text-gray-100">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Select a Project</h1>
                    <p className="mt-2 text-gray-400">Choose a workspace to continue or create a new one.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}/control-center`}
                            className="group relative flex flex-col justify-between rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-gray-900"
                        >
                            <div>
                                <h3 className="font-semibold text-white group-hover:text-indigo-400">
                                    {project.name}
                                </h3>
                                <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                                    {project.description || "No description"}
                                </p>
                            </div>
                            <div className="mt-4 flex items-center text-xs text-gray-500">
                                <span>ID: {project.id}</span>
                            </div>
                        </Link>
                    ))}

                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 bg-transparent p-6 text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-900/30 hover:text-white"
                    >
                        <span className="text-2xl">+</span>
                        <span className="mt-2 text-sm font-medium">Create New Project</span>
                    </button>
                </div>
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white">Create New Project</h2>
                        <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium uppercase text-gray-500">
                                    Project ID (unique, no spaces)
                                </label>
                                <input
                                    type="text"
                                    value={newProjectId}
                                    onChange={(e) => setNewProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    className="mt-1 block w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                                    placeholder="e.g. core-platform"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium uppercase text-gray-500">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                                    placeholder="e.g. Core Platform"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
