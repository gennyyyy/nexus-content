from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"

class TaskDependency(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source_task_id: int = Field(foreign_key="task.id")
    target_task_id: int = Field(foreign_key="task.id")
    type: str = Field(default="blocks") # How source relates to target
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None

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
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
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
    active_decisions: List[str] = []
    open_questions: List[str] = []
    recent_files: List[str] = []
    recent_entries: List[ContextEntry] = []


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
    blocked_by: List[RelatedTaskSummary] = []
    unblocks: List[RelatedTaskSummary] = []


class WorkspaceSnapshot(SQLModel):
    tasks: List["Task"] = []
    dependencies: List[TaskDependency] = []
    memory: List[TaskMemorySummary] = []
    task_states: List[TaskOperationalState] = []


class ResumePacket(SQLModel):
    task: "Task"
    task_state: TaskOperationalState
    memory: TaskMemorySummary
    blocked_by: List[RelatedTaskSummary] = []
    unblocks: List[RelatedTaskSummary] = []
    handoff_complete: bool = False
    recommended_next_actions: List[str] = []
    agent_brief: str


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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    context_entries: List[ContextEntry] = Relationship(back_populates="task")
