from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskDependency(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source_task_id: int = Field(foreign_key="task.id")
    target_task_id: int = Field(foreign_key="task.id")
    type: str = Field(default="blocks")
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


class Project(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    description: Optional[str] = None
    owner_user_id: str = Field(default="default-user")
    archived: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)


class ProjectCreate(SQLModel):
    id: str
    name: str
    description: Optional[str] = None


class ProjectArchiveUpdate(SQLModel):
    archived: bool


class ProjectMembershipCreate(SQLModel):
    user_id: str
    role: str = "member"


class UserContext(SQLModel):
    user_id: str
    role: str = "member"


class ProjectMembership(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: str = Field(foreign_key="project.id")
    user_id: str
    role: str = Field(default="member")
    created_at: datetime = Field(default_factory=utc_now)


class ProjectSnapshot(SQLModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_user_id: str = "default-user"
    archived: bool = False
    created_at: Optional[datetime] = None


class ProjectMembershipSnapshot(SQLModel):
    user_id: str
    role: str = "member"
    created_at: Optional[datetime] = None


class TaskSnapshot(SQLModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: str = "medium"
    labels: Optional[str] = None
    archived: bool = False
    created_at: Optional[datetime] = None


class TaskDependencySnapshot(SQLModel):
    source_task_id: int
    target_task_id: int
    type: str = "blocks"
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


class ContextEntrySnapshot(SQLModel):
    task_id: int
    content: str = ""
    entry_type: str = "handoff"
    summary: Optional[str] = None
    what_changed: Optional[str] = None
    files_touched: Optional[str] = None
    decisions: Optional[str] = None
    open_questions: Optional[str] = None
    next_step: Optional[str] = None
    actor: str = "System"
    source: str = "system"
    timestamp: Optional[datetime] = None


class ActivityEventSnapshot(SQLModel):
    event_type: str
    entity_type: str
    entity_id: Optional[int] = None
    task_id: Optional[int] = None
    task_title: Optional[str] = None
    title: str
    summary: str
    actor: str = "System"
    source: str = "system"
    created_at: Optional[datetime] = None


class ProjectExportBundle(SQLModel):
    version: str = "2026-03-15"
    exported_at: datetime = Field(default_factory=utc_now)
    project: ProjectSnapshot
    memberships: List[ProjectMembershipSnapshot] = Field(default_factory=list)
    tasks: List[TaskSnapshot] = Field(default_factory=list)
    dependencies: List[TaskDependencySnapshot] = Field(default_factory=list)
    context_entries: List[ContextEntrySnapshot] = Field(default_factory=list)
    activity_events: List[ActivityEventSnapshot] = Field(default_factory=list)


class ProjectImportRequest(SQLModel):
    bundle: ProjectExportBundle
    target_project_id: Optional[str] = None
    replace_existing: bool = False
    include_memberships: bool = True


class ProjectImportResult(SQLModel):
    project_id: str
    replaced_existing: bool = False
    imported_task_count: int = 0
    imported_dependency_count: int = 0
    imported_context_entry_count: int = 0
    imported_activity_event_count: int = 0
    imported_membership_count: int = 0


class ProjectBackupResult(SQLModel):
    project_id: str
    backup_file: str
    backup_path: str
    created_at: datetime = Field(default_factory=utc_now)


class LiveUpdateEvent(SQLModel):
    sequence: int
    event_type: str
    created_at: datetime
    project_id: Optional[str] = None
    request_id: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    detail: Optional[str] = None


class ActivityEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_type: str
    entity_type: str
    entity_id: Optional[int] = None
    task_id: Optional[int] = None
    task_title: Optional[str] = None
    title: str
    summary: str
    actor: str = Field(default="System")
    source: str = Field(default="system")
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    created_at: datetime = Field(default_factory=utc_now)


class ContextEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="task.id")
    content: str
    entry_type: str = Field(default="note")
    summary: Optional[str] = None
    what_changed: Optional[str] = None
    files_touched: Optional[str] = None
    decisions: Optional[str] = None
    open_questions: Optional[str] = None
    next_step: Optional[str] = None
    actor: str = Field(default="System")
    source: str = Field(default="system")
    timestamp: datetime = Field(default_factory=utc_now)

    task: "Task" = Relationship(back_populates="context_entries")


class ContextEntryCreate(SQLModel):
    content: str = ""
    entry_type: str = "handoff"
    summary: Optional[str] = None
    what_changed: Optional[str] = None
    files_touched: Optional[str] = None
    decisions: Optional[str] = None
    open_questions: Optional[str] = None
    next_step: Optional[str] = None


class TaskCreate(SQLModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: str = "medium"
    labels: Optional[str] = None
    project_id: str


class TaskArchiveUpdate(SQLModel):
    archived: bool


class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[str] = None
    labels: Optional[str] = None


class TaskMemorySummary(SQLModel):
    task_id: int
    task_title: str
    task_status: TaskStatus
    latest_summary: Optional[str] = None
    latest_next_step: Optional[str] = None
    active_decisions: List[str] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)
    recent_files: List[str] = Field(default_factory=list)
    recent_entries: List[ContextEntry] = Field(default_factory=list)


class RelatedTaskSummary(SQLModel):
    task_id: int
    task_title: str
    task_status: TaskStatus
    dependency_type: str


class TaskOperationalState(SQLModel):
    task_id: int
    is_ready: bool = False
    is_blocked: bool = False
    blocked_by_open_count: int = 0
    blocks_open_count: int = 0
    blocked_by: List[RelatedTaskSummary] = Field(default_factory=list)
    unblocks: List[RelatedTaskSummary] = Field(default_factory=list)


class WorkspaceSnapshot(SQLModel):
    tasks: List["Task"] = Field(default_factory=list)
    dependencies: List[TaskDependency] = Field(default_factory=list)
    memory: List[TaskMemorySummary] = Field(default_factory=list)
    task_states: List[TaskOperationalState] = Field(default_factory=list)


class ResumePacket(SQLModel):
    task: "Task"
    task_state: TaskOperationalState
    memory: TaskMemorySummary
    blocked_by: List[RelatedTaskSummary] = Field(default_factory=list)
    unblocks: List[RelatedTaskSummary] = Field(default_factory=list)
    handoff_complete: bool = False
    recommended_next_actions: List[str] = Field(default_factory=list)
    agent_brief: str


class ReadyQueueItem(SQLModel):
    task_id: int
    task_title: str
    description: Optional[str] = None
    task_status: TaskStatus
    priority: str = "medium"
    labels: Optional[str] = None
    latest_summary: Optional[str] = None
    latest_next_step: Optional[str] = None
    blocks_open_count: int = 0
    recent_files: List[str] = Field(default_factory=list)
    handoff_complete: bool = False


class AttentionTaskItem(SQLModel):
    task_id: int
    task_title: str
    task_status: TaskStatus
    priority: str = "medium"
    is_blocked: bool = False
    blocked_by_open_count: int = 0
    missing_summary: bool = False
    missing_next_step: bool = False
    recent_entries: int = 0
    latest_summary: Optional[str] = None
    latest_next_step: Optional[str] = None


class HandoffPulseItem(SQLModel):
    task_id: int
    task_title: str
    task_status: TaskStatus
    summary: Optional[str] = None
    next_step: Optional[str] = None
    timestamp: Optional[datetime] = None


class MCPServerStatus(SQLModel):
    name: str = "Nexus Context"
    transport: str = "sse"
    status: str = "online"
    sse_url: str = "/mcp/sse"
    post_message_url: str = "/mcp/messages"


class ControlCenterSnapshot(SQLModel):
    generated_at: datetime = Field(default_factory=utc_now)
    total_tasks: int = 0
    todo_count: int = 0
    in_progress_count: int = 0
    done_count: int = 0
    ready_count: int = 0
    blocked_count: int = 0
    handoff_gap_count: int = 0
    handoffs_last_7_days: int = 0
    ready_queue: List[ReadyQueueItem] = Field(default_factory=list)
    attention_tasks: List[AttentionTaskItem] = Field(default_factory=list)
    latest_handoffs: List[HandoffPulseItem] = Field(default_factory=list)
    server: MCPServerStatus = Field(default_factory=MCPServerStatus)


class TaskDependencyCreate(SQLModel):
    source_task_id: int
    target_task_id: int
    type: str = "blocks"
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    status: TaskStatus = Field(default=TaskStatus.TODO)
    priority: str = Field(default="medium")
    labels: Optional[str] = None
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    archived: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)

    context_entries: List[ContextEntry] = Relationship(back_populates="task")
