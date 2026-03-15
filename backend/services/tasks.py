from typing import Any

from sqlmodel import Session, select

from ..domain.models import (
    ContextEntry,
    Task,
    TaskArchiveUpdate,
    TaskDependency,
    TaskStatus,
    TaskUpdate,
    UserContext,
)
from .authz import ensure_project_access, ensure_project_owner_or_admin
from .activity import normalize_priority, record_activity, status_label
from .errors import ForbiddenError, NotFoundError


def list_tasks(
    session: Session,
    project_id: str | None = None,
    user: UserContext | None = None,
    *,
    include_archived: bool = False,
) -> list[Task]:
    if user is not None and project_id:
        ensure_project_access(
            session,
            project_id,
            user,
            allow_archived=include_archived,
        )
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if not include_archived:
        query = query.where(Task.archived == False)
    rows = session.exec(query).all()

    if user is None:
        return [task for task in rows]

    tasks: list[Task] = []
    for task in rows:
        try:
            ensure_project_access(
                session,
                task.project_id,
                user,
                allow_archived=include_archived,
            )
        except (ForbiddenError, NotFoundError):
            continue
        tasks.append(task)

    return tasks


def create_task(
    session: Session,
    *,
    title: str,
    description: str | None = None,
    status: TaskStatus | str = TaskStatus.TODO,
    priority: str = "medium",
    labels: str | None = None,
    project_id: str | None = None,
    user: UserContext | None = None,
    actor: str = "Web operator",
    source: str = "web",
) -> Task:
    if user is not None:
        ensure_project_access(session, project_id, user)
    normalized_status = status if isinstance(status, TaskStatus) else TaskStatus(status)
    db_task = Task(
        title=title,
        description=description,
        status=normalized_status,
        priority=priority,
        labels=labels,
        project_id=project_id,
    )
    session.add(db_task)
    session.flush()
    record_activity(
        session,
        event_type="task.created",
        entity_type="task",
        entity_id=db_task.id,
        task_id=db_task.id,
        task_title=db_task.title,
        title=f'Created task "{db_task.title}"',
        summary=f"Started in {status_label(db_task.status)} with {normalize_priority(db_task.priority)} priority.",
        actor=actor,
        source=source,
        project_id=db_task.project_id,
    )
    session.commit()
    session.refresh(db_task)
    return db_task


def update_task(
    session: Session,
    task_id: int,
    task_update: TaskUpdate | dict[str, Any],
    user: UserContext | None = None,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> Task:
    db_task = session.get(Task, task_id)
    if not db_task:
        raise NotFoundError("Task not found")
    if user is not None:
        ensure_project_access(session, db_task.project_id, user)

    updates = (
        task_update.model_dump(exclude_unset=True)
        if isinstance(task_update, TaskUpdate)
        else dict(task_update)
    )
    before = {
        "title": db_task.title,
        "description": db_task.description,
        "status": db_task.status,
        "priority": db_task.priority,
        "labels": db_task.labels,
    }
    changed_fields: list[str] = []
    for field, value in updates.items():
        if before.get(field) == value:
            continue
        setattr(db_task, field, value)
        changed_fields.append(field)

    if changed_fields:
        session.add(db_task)
        if "status" in changed_fields and len(changed_fields) == 1:
            record_activity(
                session,
                event_type="task.status_changed",
                entity_type="task",
                entity_id=db_task.id,
                task_id=db_task.id,
                task_title=db_task.title,
                title=f'Moved "{db_task.title}" to {status_label(db_task.status)}',
                summary=f"Status changed from {status_label(before['status'])} to {status_label(db_task.status)}.",
                actor=actor,
                source=source,
                project_id=db_task.project_id,
            )
        else:
            changed_labels = ", ".join(
                field.replace("_", " ") for field in changed_fields
            )
            status_suffix = (
                f" Status moved from {status_label(before['status'])} to {status_label(db_task.status)}."
                if "status" in changed_fields
                else ""
            )
            record_activity(
                session,
                event_type="task.updated",
                entity_type="task",
                entity_id=db_task.id,
                task_id=db_task.id,
                task_title=db_task.title,
                title=f'Updated task "{db_task.title}"',
                summary=f"Changed {changed_labels}.{status_suffix}",
                actor=actor,
                source=source,
                project_id=db_task.project_id,
            )
        session.commit()
        session.refresh(db_task)

    return db_task


def delete_task(
    session: Session,
    task_id: int,
    user: UserContext | None = None,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> None:
    task = session.get(Task, task_id)
    if not task:
        raise NotFoundError("Task not found")
    if user is not None:
        ensure_project_owner_or_admin(
            session, task.project_id or "", user, allow_archived=True
        )

    deleted_task_title = task.title
    deleted_task_status = task.status

    dependencies = list(
        session.exec(
            select(TaskDependency).where(
                (TaskDependency.source_task_id == task_id)
                | (TaskDependency.target_task_id == task_id)
            )
        ).all()
    )
    for dependency in dependencies:
        session.delete(dependency)

    context_entries = list(
        session.exec(select(ContextEntry).where(ContextEntry.task_id == task_id)).all()
    )
    for entry in context_entries:
        session.delete(entry)

    session.delete(task)
    record_activity(
        session,
        event_type="task.deleted",
        entity_type="task",
        entity_id=task_id,
        task_id=task_id,
        task_title=deleted_task_title,
        title=f'Deleted task "{deleted_task_title}"',
        summary=f"Removed the task from {status_label(deleted_task_status)} and cleared related dependencies and memory.",
        actor=actor,
        source=source,
        project_id=task.project_id,
    )
    session.commit()


def update_task_archive_state(
    session: Session,
    task_id: int,
    archive_update: TaskArchiveUpdate,
    user: UserContext,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> Task:
    task = session.get(Task, task_id)
    if not task:
        raise NotFoundError("Task not found")

    ensure_project_owner_or_admin(
        session, task.project_id or "", user, allow_archived=True
    )
    if task.archived == archive_update.archived:
        return task

    task.archived = archive_update.archived
    session.add(task)
    record_activity(
        session,
        event_type="task.archived" if archive_update.archived else "task.unarchived",
        entity_type="task",
        entity_id=task.id,
        task_id=task.id,
        task_title=task.title,
        title=(
            f'Archived task "{task.title}"'
            if archive_update.archived
            else f'Unarchived task "{task.title}"'
        ),
        summary=f"Archive state changed for {task.title}.",
        actor=actor,
        source=source,
        project_id=task.project_id,
    )
    session.commit()
    session.refresh(task)
    return task
