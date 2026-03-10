import "@xyflow/react/dist/style.css";
import { TaskContextModal } from "../components/TaskContextModal";
import { AdvancedWorkspaceView } from "./workspace/AdvancedWorkspaceView";
import { EasyWorkspaceView } from "./workspace/EasyWorkspaceView";
import { WorkspaceHeader } from "./workspace/WorkspaceHeader";
import { useWorkspaceController } from "./workspace/useWorkspaceController";

export function Workspace() {
    const workspace = useWorkspaceController();

    return (
        <div className="flex h-full min-h-0 flex-col">
            <WorkspaceHeader
                workspaceMode={workspace.workspaceMode}
                counts={workspace.counts}
                newTaskTitle={workspace.newTaskTitle}
                statusFilter={workspace.statusFilter}
                operationalFilter={workspace.operationalFilter}
                hideDone={workspace.hideDone}
                search={workspace.search}
                dependencyType={workspace.dependencyType}
                onWorkspaceModeChange={workspace.setWorkspaceMode}
                onNewTaskTitleChange={workspace.setNewTaskTitle}
                onCreateTask={workspace.handleCreateTask}
                onStatusFilterChange={workspace.setStatusFilter}
                onOperationalFilterChange={workspace.setOperationalFilter}
                onHideDoneChange={workspace.setHideDone}
                onSearchChange={workspace.setSearch}
                onDependencyTypeChange={workspace.setDependencyType}
                onAutoArrange={workspace.handleAutoArrange}
            />

            <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 overflow-hidden px-5 py-5 sm:px-6 lg:px-8">
                {workspace.workspaceMode === "easy" ? (
                    <EasyWorkspaceView
                        tasksByStatus={workspace.tasksByStatus}
                        memoryByTask={workspace.memoryByTask}
                        operationalByTask={workspace.operationalByTask}
                        readyTasks={workspace.readyTasks}
                        selectedTask={workspace.selectedTask}
                        selectedMemory={workspace.selectedMemory}
                        selectedState={workspace.selectedState}
                        selectedFlow={workspace.selectedFlow}
                        inspectorDraft={workspace.inspectorDraft}
                        onInspectorFieldChange={workspace.updateInspectorField}
                        onSaveTaskDetails={workspace.handleSaveTaskDetails}
                        onDeleteSelectedTask={workspace.handleDeleteSelectedTask}
                        onStatusChange={workspace.handleStatusChange}
                        onBoardDragEnd={workspace.handleBoardDragEnd}
                        onQuickOpenTask={workspace.selectTask}
                        onOpenContext={workspace.openContextTask}
                    />
                ) : (
                    <AdvancedWorkspaceView
                        tasks={workspace.tasks}
                        visibleTasks={workspace.visibleTasks}
                        memoryByTask={workspace.memoryByTask}
                        operationalByTask={workspace.operationalByTask}
                        visibleNodes={workspace.visibleNodes}
                        visibleEdges={workspace.visibleEdges}
                        loading={workspace.loading}
                        savingEdge={workspace.savingEdge}
                        dependencyType={workspace.dependencyType}
                        selectedTask={workspace.selectedTask}
                        selectedMemory={workspace.selectedMemory}
                        selectedState={workspace.selectedState}
                        selectedFlow={workspace.selectedFlow}
                        selectedDependency={workspace.selectedDependency}
                        inspectorDraft={workspace.inspectorDraft}
                        onInspectorFieldChange={workspace.updateInspectorField}
                        onSelectTask={workspace.selectTask}
                        onOpenContext={workspace.openContextTask}
                        onSaveTaskDetails={workspace.handleSaveTaskDetails}
                        onDeleteSelectedTask={workspace.handleDeleteSelectedTask}
                        onStatusChange={workspace.handleStatusChange}
                        onDeleteSelectedEdge={workspace.handleDeleteSelectedEdge}
                        onConnect={workspace.handleConnect}
                        onNodesChange={workspace.handleGraphNodesChange}
                        onEdgesChange={workspace.onEdgesChange}
                        onSelectEdge={workspace.setSelectedEdgeId}
                    />
                )}
            </div>

            <TaskContextModal task={workspace.contextTask} onClose={workspace.closeContextTask} />
        </div>
    );
}
