from sqlmodel import Session, select

from ..domain.models import (
    ActivityEvent,
    ContextEntry,
    ControlCenterSnapshot,
    Task,
    TaskOperationalState,
    TaskDependency,
    UserContext,
    WorkspaceSnapshot,
)
from .authz import ensure_project_access
from .activity import (
    build_activity_feed,
    build_control_center_snapshot,
    build_task_activity_feed,
)
from .errors import ForbiddenError, NotFoundError
from .workspace import build_operational_states, build_workspace_snapshot


def _load_tasks(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> list[Task]:
    if user is not None and project_id:
        ensure_project_access(session, project_id, user)

    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    query = query.where(Task.archived == False)
    rows = session.exec(query).all()
    tasks: list[Task] = []
    for task in rows:
        if user is None:
            tasks.append(task)
            continue
        try:
            ensure_project_access(session, task.project_id, user)
        except (ForbiddenError, NotFoundError):
            continue
        tasks.append(task)
    return tasks


def _load_dependencies(
    session: Session, tasks: list[Task], project_id: str | None = None
) -> list[TaskDependency]:
    dependency_rows = session.exec(select(TaskDependency)).all()
    dependencies = [dependency for dependency in dependency_rows]
    if not project_id:
        return dependencies

    task_ids = {task.id for task in tasks if task.id is not None}
    if not task_ids:
        return []

    return [
        dependency
        for dependency in dependencies
        if dependency.source_task_id in task_ids
        and dependency.target_task_id in task_ids
    ]


def _load_context_entries(
    session: Session, tasks: list[Task], project_id: str | None = None
) -> list[ContextEntry]:
    entry_rows = session.exec(select(ContextEntry)).all()
    entries = [entry for entry in entry_rows]
    if not project_id:
        return entries

    task_ids = {task.id for task in tasks if task.id is not None}
    if not task_ids:
        return []

    return [entry for entry in entries if entry.task_id in task_ids]


def list_task_operational_states(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> list[TaskOperationalState]:
    tasks = _load_tasks(session, project_id, user)
    dependencies = _load_dependencies(session, tasks, project_id)
    return build_operational_states(tasks, dependencies)


def get_workspace_snapshot(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> WorkspaceSnapshot:
    tasks = _load_tasks(session, project_id, user)
    dependencies = _load_dependencies(session, tasks, project_id)
    entries = _load_context_entries(session, tasks, project_id)
    return build_workspace_snapshot(tasks, dependencies, entries)


def get_control_center_snapshot(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> ControlCenterSnapshot:
    tasks = _load_tasks(session, project_id, user)
    dependencies = _load_dependencies(session, tasks, project_id)
    entries = _load_context_entries(session, tasks, project_id)
    return build_control_center_snapshot(tasks, dependencies, entries)


def list_activity_events(
    session: Session,
    limit: int = 60,
    project_id: str | None = None,
    user: UserContext | None = None,
    search: str | None = None,
) -> list[ActivityEvent]:
    tasks = _load_tasks(session, project_id, user)
    visible_task_ids = {task.id for task in tasks if task.id is not None}
    events = build_activity_feed(session, limit * 3, project_id)
    filtered = [
        event
        for event in events
        if event.task_id is None or event.task_id in visible_task_ids
    ]
    if search and search.strip():
        needle = search.strip().lower()
        filtered = [
            event
            for event in filtered
            if needle in (event.title or "").lower()
            or needle in (event.summary or "").lower()
            or needle in (event.task_title or "").lower()
            or needle in (event.actor or "").lower()
            or needle in (event.event_type or "").lower()
        ]
    return filtered[: max(1, min(limit, 200))]


def list_task_activity_events(
    session: Session,
    task_id: int,
    limit: int = 60,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> list[ActivityEvent]:
    task = session.get(Task, task_id)
    if not task or (project_id is not None and task.project_id != project_id):
        raise NotFoundError("Task not found")
    if user is not None:
        ensure_project_access(session, task.project_id, user, allow_archived=True)
    return build_task_activity_feed(session, task_id, limit, project_id)


def get_operator_metrics(
    session: Session, project_id: str | None = None
) -> dict[str, object]:
    tasks = _load_tasks(session, project_id)
    dependencies = _load_dependencies(session, tasks, project_id)
    entries = _load_context_entries(session, tasks, project_id)
    operational_states = build_operational_states(tasks, dependencies)

    return {
        "project_id": project_id,
        "task_count": len(tasks),
        "dependency_count": len(dependencies),
        "context_entry_count": len(entries),
        "ready_task_count": sum(1 for state in operational_states if state.is_ready),
        "blocked_task_count": sum(
            1 for state in operational_states if state.is_blocked
        ),
        "in_progress_task_count": sum(
            1 for task in tasks if task.status == "in_progress"
        ),
        "todo_task_count": sum(1 for task in tasks if task.status == "todo"),
        "done_task_count": sum(1 for task in tasks if task.status == "done"),
    }
