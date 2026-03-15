from sqlmodel import Session, select

from ..domain.models import Task, TaskDependency, TaskDependencyCreate, UserContext
from .authz import ensure_project_access, ensure_project_owner_or_admin
from .activity import record_activity
from .errors import ForbiddenError, NotFoundError, ValidationError


def list_dependencies(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
) -> list[TaskDependency]:
    if user is not None and project_id:
        ensure_project_access(session, project_id, user)

    rows = session.exec(select(TaskDependency)).all()
    dependencies = [dependency for dependency in rows]
    if not project_id:
        if user is None:
            return dependencies

        task_rows = session.exec(select(Task).where(Task.archived == False)).all()
        visible_task_ids = set()
        for task in task_rows:
            try:
                ensure_project_access(session, task.project_id, user)
            except (ForbiddenError, NotFoundError):
                continue
            if task.id is not None:
                visible_task_ids.add(task.id)
        return [
            dependency
            for dependency in dependencies
            if dependency.source_task_id in visible_task_ids
            and dependency.target_task_id in visible_task_ids
        ]

    task_rows = session.exec(
        select(Task).where(Task.project_id == project_id, Task.archived == False)
    ).all()
    task_ids = {task.id for task in task_rows if task.id is not None}
    if not task_ids:
        return []

    return [
        dependency
        for dependency in dependencies
        if dependency.source_task_id in task_ids
        and dependency.target_task_id in task_ids
    ]


def create_dependency(
    session: Session,
    dependency: TaskDependencyCreate,
    user: UserContext | None = None,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> TaskDependency:
    if dependency.source_task_id == dependency.target_task_id:
        raise ValidationError("A task cannot depend on itself")

    source_task = session.get(Task, dependency.source_task_id)
    target_task = session.get(Task, dependency.target_task_id)
    if not source_task or not target_task:
        raise NotFoundError("Source or target task not found")
    if source_task.archived or target_task.archived:
        raise ValidationError("Archived tasks cannot be linked")
    if source_task.project_id != target_task.project_id:
        raise ValidationError("Dependencies must connect tasks within the same project")
    if user is not None:
        ensure_project_owner_or_admin(
            session,
            source_task.project_id or "",
            user,
            allow_archived=True,
        )

    existing = session.exec(
        select(TaskDependency).where(
            TaskDependency.source_task_id == dependency.source_task_id,
            TaskDependency.target_task_id == dependency.target_task_id,
            TaskDependency.type == dependency.type,
        )
    ).first()
    if existing:
        existing.source_handle = dependency.source_handle
        existing.target_handle = dependency.target_handle
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    db_dependency = TaskDependency.model_validate(dependency)
    session.add(db_dependency)
    session.flush()
    record_activity(
        session,
        event_type="dependency.created",
        entity_type="dependency",
        entity_id=db_dependency.id,
        task_id=target_task.id,
        task_title=target_task.title,
        title=f'Linked "{source_task.title}" to "{target_task.title}"',
        summary=f"Added a {dependency.type} dependency between the tasks.",
        actor=actor,
        source=source,
        project_id=target_task.project_id,
    )
    session.commit()
    session.refresh(db_dependency)
    return db_dependency


def delete_dependency(
    session: Session,
    dependency_id: int,
    user: UserContext | None = None,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> None:
    dependency = session.get(TaskDependency, dependency_id)
    if not dependency:
        raise NotFoundError("Dependency not found")

    source_task = session.get(Task, dependency.source_task_id)
    target_task = session.get(Task, dependency.target_task_id)
    dependency_project_id = None
    if target_task is not None:
        dependency_project_id = target_task.project_id
    elif source_task is not None:
        dependency_project_id = source_task.project_id
    if user is not None:
        ensure_project_owner_or_admin(
            session,
            dependency_project_id or "",
            user,
            allow_archived=True,
        )
    source_title = (
        source_task.title if source_task else f"Task {dependency.source_task_id}"
    )
    target_title = (
        target_task.title if target_task else f"Task {dependency.target_task_id}"
    )

    record_activity(
        session,
        event_type="dependency.deleted",
        entity_type="dependency",
        entity_id=dependency_id,
        task_id=dependency.target_task_id,
        task_title=target_task.title if target_task else None,
        title=f'Removed dependency from "{source_title}" to "{target_title}"',
        summary=f"Deleted the {dependency.type} link.",
        actor=actor,
        source=source,
        project_id=dependency_project_id,
    )
    session.delete(dependency)
    session.commit()
