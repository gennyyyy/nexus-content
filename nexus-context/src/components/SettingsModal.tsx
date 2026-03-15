import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, FolderGit2, Shield, UserRound, X, Plus } from "lucide-react";
import {
    createProject,
    fetchProjectMemberships,
    fetchProjectsWithOptions,
    fetchTasksWithOptions,
    upsertProjectMembership,
    updateProjectArchiveState,
    updateTaskArchiveState,
    type Project,
    type ProjectMembership,
    type Task,
} from "../lib/api";
import { useToast } from "./toast-context";
import { useUserSession } from "./user-session-context";
import type { UserRole } from "../lib/user-session";
import { useQueryClient } from "@tanstack/react-query";
import { appQueryKeys } from "../lib/queryKeys";

type MembershipRole = "member" | "owner";

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
    const [sessionDraft, setSessionDraft] = useState({ userId: "", role: "member" as UserRole });
    const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
    const [memberships, setMemberships] = useState<ProjectMembership[]>([]);
    const [membershipDraft, setMembershipDraft] = useState({
        user_id: "",
        role: "member" as MembershipRole,
    });
    const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
    const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
    const [busyMembershipUserId, setBusyMembershipUserId] = useState<string | null>(null);
    const navigate = useNavigate();
    const { projectId } = useParams();
    const { session, updateSession, resetSession } = useUserSession();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const roleOptions = useMemo(
        () => [
            { value: "member", label: "Member" },
            { value: "owner", label: "Owner" },
            { value: "admin", label: "Admin" },
        ] satisfies Array<{ value: UserRole; label: string }>,
        [],
    );

    const membershipRoleOptions = useMemo(
        () => [
            { value: "member", label: "Member" },
            { value: "owner", label: "Owner" },
        ] satisfies Array<{ value: MembershipRole; label: string }>,
        [],
    );

    const currentProject = useMemo(
        () => projects.find((project) => project.id === projectId) ?? null,
        [projectId, projects],
    );

    const currentUserMembership = useMemo(
        () => memberships.find((membership) => membership.user_id === session.userId) ?? null,
        [memberships, session.userId],
    );

    const canManageMemberships = Boolean(
        currentProject
        && (
            session.role === "admin"
            || currentProject.owner_user_id === session.userId
            || currentUserMembership?.role === "owner"
        ),
    );

    const sortedMemberships = useMemo(() => {
        return [...memberships].sort((left, right) => {
            const leftPriority = left.user_id === currentProject?.owner_user_id || left.role === "owner" ? 1 : 0;
            const rightPriority = right.user_id === currentProject?.owner_user_id || right.role === "owner" ? 1 : 0;
            if (leftPriority !== rightPriority) {
                return rightPriority - leftPriority;
            }
            return left.user_id.localeCompare(right.user_id);
        });
    }, [currentProject, memberships]);

    const draftMembershipExists = useMemo(
        () => memberships.some((membership) => membership.user_id === membershipDraft.user_id.trim()),
        [membershipDraft.user_id, memberships],
    );

    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchProjectsWithOptions({ includeArchived: true });
            setProjects(data);
            const selectedProject = projectId
                ? data.find((project) => project.id === projectId)
                : null;
            if (selectedProject && projectId) {
                const [tasks, membershipRows] = await Promise.all([
                    fetchTasksWithOptions(projectId, {
                        includeArchived: true,
                    }),
                    fetchProjectMemberships(projectId),
                ]);
                setArchivedTasks(tasks.filter((task) => task.archived));
                setMemberships(membershipRows);
            } else {
                setArchivedTasks([]);
                setMemberships([]);
            }
        } catch (error) {
            console.error("Failed to load projects", error);
            toast(error instanceof Error ? error.message : "Failed to load projects", "error");
        } finally {
            setIsLoading(false);
        }
    }, [projectId, toast]);

    const refreshCaches = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: appQueryKeys.projects.all }),
            queryClient.invalidateQueries({ queryKey: appQueryKeys.tasks.all }),
            queryClient.invalidateQueries({ queryKey: appQueryKeys.memory.all }),
            queryClient.invalidateQueries({ queryKey: appQueryKeys.controlCenter.all }),
            queryClient.invalidateQueries({ queryKey: appQueryKeys.ops.all }),
        ]);
    }, [queryClient]);

    useEffect(() => {
        if (isOpen) {
            setSessionDraft(session);
            void loadProjects();
        }
    }, [isOpen, loadProjects, session]);

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault();
        if (!newProjectId || !newProjectName) return;

        try {
            const created = await createProject({
                id: newProjectId,
                name: newProjectName,
                description: `Project ${newProjectName}`
            });
            toast(`Created project "${created.name}"`, "success");
            setIsCreating(false);
            setNewProjectId("");
            setNewProjectName("");
            await refreshCaches();
            await loadProjects();
            navigate(`/projects/${created.id}/control-center`);
            onClose();
        } catch (error) {
            console.error("Failed to create project", error);
            toast(error instanceof Error ? error.message : "Failed to create project", "error");
        }
    }

    async function handleSaveSession(e: React.FormEvent) {
        e.preventDefault();
        try {
            const updated = await updateSession(sessionDraft);
            toast(`Signed in as ${updated.userId} (${updated.role})`, "success");
            await loadProjects();
        } catch (error) {
            toast(error instanceof Error ? error.message : "Failed to save user session", "error");
        }
    }

    async function handleResetSession() {
        const reset = await resetSession();
        setSessionDraft(reset);
        setMembershipDraft({ user_id: "", role: "member" });
        toast(`Reset to ${reset.userId} (${reset.role})`, "info");
        await loadProjects();
    }

    async function handleUpsertMembership(e: React.FormEvent) {
        e.preventDefault();
        if (!projectId) return;

        const userId = membershipDraft.user_id.trim();
        if (!userId) return;

        if (
            currentProject?.owner_user_id
            && userId === currentProject.owner_user_id
            && membershipDraft.role !== "owner"
        ) {
            toast("The project creator must keep owner access.", "error");
            return;
        }

        setBusyMembershipUserId(userId);
        try {
            const membership = await upsertProjectMembership(projectId, {
                user_id: userId,
                role: membershipDraft.role,
            });
            toast(
                `Updated access for ${membership.user_id} to ${membership.role}.`,
                "success",
            );
            setMembershipDraft({ user_id: "", role: "member" });
            await refreshCaches();
            await loadProjects();
        } catch (error) {
            toast(
                error instanceof Error
                    ? error.message
                    : "Failed to update project membership",
                "error",
            );
        } finally {
            setBusyMembershipUserId(null);
        }
    }

    async function handleToggleProjectArchive(project: Project) {
        setBusyProjectId(project.id);
        try {
            const updated = await updateProjectArchiveState(project.id, !project.archived);
            toast(
                updated.archived
                    ? `Archived project "${updated.name}"`
                    : `Restored project "${updated.name}"`,
                "success",
            );
            await refreshCaches();
            await loadProjects();
        } catch (error) {
            toast(
                error instanceof Error
                    ? error.message
                    : "Failed to update project archive state",
                "error",
            );
        } finally {
            setBusyProjectId(null);
        }
    }

    async function handleRestoreTask(task: Task) {
        if (!task.id) return;
        setBusyTaskId(task.id);
        try {
            await updateTaskArchiveState(task.id, false);
            toast(`Restored task "${task.title}"`, "success");
            await refreshCaches();
            await loadProjects();
        } catch (error) {
            toast(
                error instanceof Error ? error.message : "Failed to restore task",
                "error",
            );
        } finally {
            setBusyTaskId(null);
        }
    }

    function handleSwitchProject(id: string) {
        navigate(`/projects/${id}/control-center`);
        onClose();
    }

    function handleEditMembership(membership: ProjectMembership) {
        setMembershipDraft({
            user_id: membership.user_id,
            role: membership.role === "owner" ? "owner" : "member",
        });
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
                    <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            <UserRound size={13} className="text-sky-400" />
                            Active Session
                        </div>
                        <form onSubmit={handleSaveSession} className="space-y-3">
                            <div>
                                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                                    Nexus User
                                </label>
                                <input
                                    type="text"
                                    value={sessionDraft.userId}
                                    onChange={(e) => setSessionDraft((prev) => ({ ...prev, userId: e.target.value }))}
                                    className="block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none transition-all"
                                    placeholder="e.g. alex-owner"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                                    Role
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {roleOptions.map((option) => {
                                        const active = sessionDraft.role === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setSessionDraft((prev) => ({ ...prev, role: option.value }))}
                                                className={`rounded border px-2 py-2 text-[11px] font-semibold transition-all ${active
                                                    ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                                                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-400">
                                <span className="flex items-center gap-1.5">
                                    <Shield size={12} className="text-emerald-400" />
                                    Requests send `X-Nexus-User` and `X-Nexus-Role`
                                </span>
                                <span className="rounded bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300">
                                    {session.userId} / {session.role}
                                </span>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => void handleResetSession()}
                                    className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    className="rounded bg-sky-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/20"
                                >
                                    Apply Session
                                </button>
                            </div>
                        </form>
                    </div>

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
                                                <div className="text-[10px] text-zinc-500 font-mono tracking-tight">
                                                    ID: {project.id}{project.archived ? " • archived" : ""}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => void handleToggleProjectArchive(project)}
                                                disabled={busyProjectId === project.id}
                                                className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                                            >
                                                {project.archived ? "Restore" : "Archive"}
                                            </button>
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {projectId ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <Shield size={13} className="text-sky-300" />
                                    Project Access
                                </div>

                                <div className="mb-3 rounded border border-zinc-800/70 bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-400">
                                    {currentProject ? (
                                        canManageMemberships ? (
                                            <span>
                                                You can update access for <span className="font-semibold text-zinc-200">{currentProject.name}</span>.
                                            </span>
                                        ) : (
                                            <span>
                                                You can view access for <span className="font-semibold text-zinc-200">{currentProject.name}</span>, but only owners or admins can change it.
                                            </span>
                                        )
                                    ) : (
                                        <span>Switch to an accessible project to inspect memberships.</span>
                                    )}
                                </div>

                                {canManageMemberships ? (
                                    <form onSubmit={handleUpsertMembership} className="mb-4 space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-3">
                                        <div>
                                            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                                                User ID
                                            </label>
                                            <input
                                                type="text"
                                                value={membershipDraft.user_id}
                                                onChange={(event) => setMembershipDraft((prev) => ({
                                                    ...prev,
                                                    user_id: event.target.value,
                                                }))}
                                                placeholder="e.g. qa-member"
                                                className="block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                                                Access Level
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {membershipRoleOptions.map((option) => {
                                                    const active = membershipDraft.role === option.value;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            onClick={() => setMembershipDraft((prev) => ({ ...prev, role: option.value }))}
                                                            className={`rounded border px-2 py-2 text-[11px] font-semibold transition-all ${active
                                                                ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                                                                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                                                }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pt-1">
                                            <div className="text-[11px] text-zinc-500">
                                                {draftMembershipExists ? "Update an existing member" : "Grant access to a new member"}
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!membershipDraft.user_id.trim() || busyMembershipUserId === membershipDraft.user_id.trim()}
                                                className="rounded bg-sky-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/20 disabled:opacity-50"
                                            >
                                                {draftMembershipExists ? "Save Access" : "Grant Access"}
                                            </button>
                                        </div>
                                    </form>
                                ) : null}

                                {sortedMemberships.length > 0 ? (
                                    <div className="space-y-2">
                                        {sortedMemberships.map((membership) => {
                                            const isCreator = membership.user_id === currentProject?.owner_user_id;
                                            const isCurrentUser = membership.user_id === session.userId;
                                            return (
                                                <div
                                                    key={`${membership.project_id}-${membership.user_id}`}
                                                    className={`rounded border px-3 py-2 ${isCurrentUser
                                                        ? "border-sky-500/30 bg-sky-500/8"
                                                        : "border-zinc-800 bg-zinc-950/70"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-medium text-zinc-200">
                                                                {membership.user_id}
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider">
                                                                <span className={`rounded border px-2 py-0.5 ${membership.role === "owner"
                                                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                                                                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
                                                                    }`}>
                                                                    {membership.role}
                                                                </span>
                                                                {isCreator ? (
                                                                    <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-100">
                                                                        creator
                                                                    </span>
                                                                ) : null}
                                                                {isCurrentUser ? (
                                                                    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-100">
                                                                        you
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        {canManageMemberships && !isCreator ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditMembership(membership)}
                                                                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                                            >
                                                                Edit
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500">No membership records found for this project yet.</p>
                                )}
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <Archive size={13} className="text-amber-300" />
                                    Archived Tasks
                                </div>
                                {archivedTasks.length > 0 ? (
                                    <div className="space-y-2">
                                        {archivedTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/70 px-3 py-2"
                                            >
                                                <div>
                                                    <div className="text-sm font-medium text-zinc-200">{task.title}</div>
                                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                                                        {task.status}{task.id ? ` • #${task.id}` : ""}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRestoreTask(task)}
                                                    disabled={busyTaskId === task.id}
                                                    className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
                                                >
                                                    <ArchiveRestore size={11} /> Restore
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500">No archived tasks in this project.</p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
}
