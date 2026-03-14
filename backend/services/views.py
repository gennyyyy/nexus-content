from sqlmodel import Session, select

from ..domain.models import (
    ActivityEvent,
    ContextEntry,
    ControlCenterSnapshot,
    Task,
    TaskOperationalState,
    TaskDependency,
    WorkspaceSnapshot,
)
from .activity import (
    build_activity_feed,
    build_control_center_snapshot,
    build_task_activity_feed,
)
from .workspace import build_operational_states, build_workspace_snapshot


def _load_tasks(session: Session, project_id: str | None = None) -> list[Task]:
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    rows = session.exec(query).all()
    return [task for task in rows]


def list_task_operational_states(
    session: Session, project_id: str | None = None
) -> list[TaskOperationalState]:
    tasks = _load_tasks(session, project_id)
    dependency_rows = session.exec(select(TaskDependency)).all()
    dependencies = [dependency for dependency in dependency_rows]
    return build_operational_states(tasks, dependencies)


def get_workspace_snapshot(
    session: Session, project_id: str | None = None
) -> WorkspaceSnapshot:
    tasks = _load_tasks(session, project_id)
    dependency_rows = session.exec(select(TaskDependency)).all()
    entry_rows = session.exec(select(ContextEntry)).all()
    dependencies = [dependency for dependency in dependency_rows]
    entries = [entry for entry in entry_rows]
    return build_workspace_snapshot(tasks, dependencies, entries)


def get_control_center_snapshot(
    session: Session, project_id: str | None = None
) -> ControlCenterSnapshot:
    tasks = _load_tasks(session, project_id)
    dependency_rows = session.exec(select(TaskDependency)).all()
    entry_rows = session.exec(select(ContextEntry)).all()
    dependencies = [dependency for dependency in dependency_rows]
    entries = [entry for entry in entry_rows]
    return build_control_center_snapshot(tasks, dependencies, entries)


def list_activity_events(
    session: Session, limit: int = 60, project_id: str | None = None
) -> list[ActivityEvent]:
    return build_activity_feed(session, limit, project_id)


def list_task_activity_events(
    session: Session, task_id: int, limit: int = 60
) -> list[ActivityEvent]:
    return build_task_activity_feed(session, task_id, limit)
