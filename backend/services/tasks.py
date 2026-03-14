from typing import Any

from sqlmodel import Session, select

from ..domain.models import ContextEntry, Task, TaskDependency, TaskStatus, TaskUpdate
from .activity import normalize_priority, record_activity, status_label
from .errors import NotFoundError


def list_tasks(session: Session, project_id: str | None = None) -> list[Task]:
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == project_id)
    rows = session.exec(query).all()
    return [task for task in rows]


def create_task(
    session: Session,
    *,
    title: str,
    description: str | None = None,
    status: TaskStatus | str = TaskStatus.TODO,
    priority: str = "medium",
    labels: str | None = None,
    project_id: str | None = None,
    actor: str = "Web operator",
    source: str = "web",
) -> Task:
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
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> Task:
    db_task = session.get(Task, task_id)
    if not db_task:
        raise NotFoundError("Task not found")

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
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> None:
    task = session.get(Task, task_id)
    if not task:
        raise NotFoundError("Task not found")

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
