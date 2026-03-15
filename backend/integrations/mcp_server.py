import json

from mcp.server.fastmcp import FastMCP
from sqlmodel import Session, select

from ..db.session import get_engine
from ..domain.models import (
    ContextEntryCreate,
    Task,
    TaskDependency,
    TaskDependencyCreate,
    TaskMemorySummary,
    TaskStatus,
)
from ..services.context import (
    create_memory_handoff,
    create_task_context,
    get_task_memory_summary,
    get_task_resume_packet,
)
from ..services.dependencies import create_dependency
from ..services.errors import NotFoundError
from ..services.tasks import create_task as create_task_service, update_task
from ..services.workspace import build_operational_states

mcp = FastMCP("nexus-context")


def build_memory_payload(task: Task, memory: TaskMemorySummary) -> dict[str, object]:
    return {
        "task": {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
        },
        "latest_summary": memory.latest_summary,
        "latest_next_step": memory.latest_next_step,
        "recent_files": memory.recent_files[:10],
        "decisions": memory.active_decisions[:6],
        "open_questions": memory.open_questions[:6],
        "recent_entries": [
            {
                "timestamp": entry.timestamp.isoformat(),
                "entry_type": entry.entry_type,
                "summary": entry.summary,
                "what_changed": entry.what_changed,
                "next_step": entry.next_step,
            }
            for entry in memory.recent_entries[:8]
        ],
    }


def _load_tasks(session: Session, project_id: str | None = None) -> list[Task]:
    statement = select(Task)
    if project_id:
        statement = statement.where(Task.project_id == project_id)
    rows = session.exec(statement).all()
    return [task for task in rows]


def _load_dependencies(
    session: Session, tasks: list[Task], project_id: str | None = None
) -> list[TaskDependency]:
    rows = session.exec(select(TaskDependency)).all()
    dependencies = [dependency for dependency in rows]
    if not project_id:
        return dependencies

    task_ids = {task.id for task in tasks if task.id is not None}
    return [
        dependency
        for dependency in dependencies
        if dependency.source_task_id in task_ids
        and dependency.target_task_id in task_ids
    ]


@mcp.tool()
async def get_task_graph(project_id: str | None = None) -> str:
    """Get the full tree of tasks and their connections."""
    with Session(get_engine()) as session:
        tasks = _load_tasks(session, project_id)
        dependencies = _load_dependencies(session, tasks, project_id)
        states = {
            state.task_id: state
            for state in build_operational_states(tasks, dependencies)
        }

        payload = {
            "tasks": [
                {
                    "id": task.id,
                    "title": task.title,
                    "status": task.status,
                    "is_ready": states[task.id].is_ready
                    if task.id is not None and task.id in states
                    else False,
                    "is_blocked": states[task.id].is_blocked
                    if task.id is not None and task.id in states
                    else False,
                }
                for task in tasks
            ],
            "dependencies": [
                {
                    "source": dependency.source_task_id,
                    "target": dependency.target_task_id,
                    "type": dependency.type,
                    "source_handle": dependency.source_handle,
                    "target_handle": dependency.target_handle,
                }
                for dependency in dependencies
            ],
        }
        return json.dumps(payload)


@mcp.tool()
async def get_ready_tasks(project_id: str | None = None) -> str:
    """Get tasks that are ready to start now because they are todo and not blocked by open dependencies."""
    with Session(get_engine()) as session:
        tasks = _load_tasks(session, project_id)
        dependencies = _load_dependencies(session, tasks, project_id)
        states = {
            state.task_id: state
            for state in build_operational_states(tasks, dependencies)
        }

        ready_tasks = []
        for task in tasks:
            if task.id is None:
                continue
            state = states.get(task.id)
            if not state or not state.is_ready:
                continue
            ready_tasks.append(
                {
                    "id": task.id,
                    "title": task.title,
                    "status": task.status,
                    "priority": task.priority,
                    "labels": task.labels,
                    "blocks_open_count": state.blocks_open_count,
                }
            )

        return json.dumps(ready_tasks)


@mcp.tool()
async def get_resume_packet(task_id: int, project_id: str | None = None) -> str:
    """Get a single task's resume packet with memory, blockers, and recommended next actions."""
    with Session(get_engine()) as session:
        try:
            packet = get_task_resume_packet(session, task_id, project_id)
        except NotFoundError:
            return f"Error: Task {task_id} not found."
        return packet.model_dump_json()


@mcp.tool()
async def create_task(
    title: str,
    description: str = "",
    parent_task_id: int | None = None,
    project_id: str | None = None,
) -> str:
    """Create a new task, optionally linking it to a parent task that it blocks."""
    with Session(get_engine()) as session:
        scoped_project_id = project_id
        if parent_task_id is not None:
            parent_task = session.get(Task, parent_task_id)
            if not parent_task:
                return f"Error: Parent task {parent_task_id} not found."
            if (
                scoped_project_id is not None
                and parent_task.project_id != scoped_project_id
            ):
                return (
                    f"Error: Parent task {parent_task_id} belongs to project "
                    f"{parent_task.project_id}, not {scoped_project_id}."
                )
            scoped_project_id = parent_task.project_id

        task = create_task_service(
            session,
            title=title,
            description=description,
            status=TaskStatus.TODO,
            project_id=scoped_project_id,
            actor="MCP agent",
            source="mcp",
        )

        if task.id is None:
            return "Error: Task creation failed."

        if parent_task_id is not None:
            try:
                create_dependency(
                    session,
                    TaskDependencyCreate(
                        source_task_id=task.id,
                        target_task_id=parent_task_id,
                        type="blocks",
                    ),
                    actor="MCP agent",
                    source="mcp",
                )
            except NotFoundError:
                return (
                    f"Task created with ID: {task.id}, but parent task "
                    f"{parent_task_id} was not found."
                )

        return f"Task created with ID: {task.id}"


@mcp.tool()
async def update_task_status(
    task_id: int, status: str, project_id: str | None = None
) -> str:
    """Update task status ('todo', 'in_progress', 'done')."""
    with Session(get_engine()) as session:
        try:
            task = session.get(Task, task_id)
            if not task or (project_id is not None and task.project_id != project_id):
                return f"Error: Task {task_id} not found."
            update_task(
                session,
                task_id,
                {"status": TaskStatus(status)},
                actor="MCP agent",
                source="mcp",
            )
            return f"Task {task_id} updated to {status}."
        except NotFoundError:
            return f"Error: Task {task_id} not found."
        except ValueError:
            return f"Error: Invalid status '{status}'."


@mcp.tool()
async def add_context(task_id: int, content: str, project_id: str | None = None) -> str:
    """Document progress or add context to a task."""
    with Session(get_engine()) as session:
        task = session.get(Task, task_id)
        if not task or (project_id is not None and task.project_id != project_id):
            return f"Error: Task {task_id} not found."
        try:
            create_task_context(
                session,
                task_id,
                ContextEntryCreate(content=content, entry_type="note"),
                project_id=task.project_id,
                actor="MCP agent",
                source="mcp",
            )
        except NotFoundError:
            return f"Error: Task {task_id} not found."
        return f"Context added to Task {task_id}."


@mcp.tool()
async def get_task_memory(task_id: int, project_id: str | None = None) -> str:
    """Get the latest handoff memory for a task so an agent can resume work cleanly."""
    with Session(get_engine()) as session:
        task = session.get(Task, task_id)
        if not task or (project_id is not None and task.project_id != project_id):
            return f"Error: Task {task_id} not found."

        memory = get_task_memory_summary(session, task_id, task.project_id)
        return json.dumps(build_memory_payload(task, memory))


@mcp.tool()
async def add_memory_handoff(
    task_id: int,
    summary: str,
    what_changed: str = "",
    files_touched: str = "",
    decisions: str = "",
    open_questions: str = "",
    next_step: str = "",
    project_id: str | None = None,
) -> str:
    """Write a structured memory handoff so another agent can continue the task without losing context."""
    with Session(get_engine()) as session:
        task = session.get(Task, task_id)
        if not task or (project_id is not None and task.project_id != project_id):
            return f"Error: Task {task_id} not found."
        try:
            create_memory_handoff(
                session,
                task_id,
                summary=summary,
                what_changed=what_changed,
                files_touched=files_touched,
                decisions=decisions,
                open_questions=open_questions,
                next_step=next_step,
                project_id=task.project_id,
                actor="MCP agent",
                source="mcp",
            )
        except NotFoundError:
            return f"Error: Task {task_id} not found."
        return f"Memory handoff added to Task {task_id}."
