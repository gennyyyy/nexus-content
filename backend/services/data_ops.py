from __future__ import annotations

import json
from pathlib import Path

from sqlmodel import Session, delete, select

from ..domain.models import (
    ActivityEvent,
    ActivityEventSnapshot,
    ContextEntry,
    ContextEntrySnapshot,
    Project,
    ProjectBackupResult,
    ProjectExportBundle,
    ProjectImportRequest,
    ProjectImportResult,
    ProjectMembership,
    ProjectMembershipSnapshot,
    ProjectSnapshot,
    Task,
    TaskDependency,
    TaskDependencySnapshot,
    TaskSnapshot,
    UserContext,
)
from ..telemetry import request_telemetry
from .activity import record_activity, truncate
from .authz import ensure_project_access, ensure_project_owner_or_admin
from .errors import ConflictError, ValidationError


def _backup_directory() -> Path:
    return Path(__file__).resolve().parents[1] / "backups"


def export_project_bundle(
    session: Session,
    project_id: str,
    user: UserContext,
) -> ProjectExportBundle:
    project = ensure_project_access(session, project_id, user, allow_archived=True)
    if project is None:
        raise ValidationError("Project not found")

    tasks = session.exec(select(Task).where(Task.project_id == project_id)).all()
    task_ids = {task.id for task in tasks if task.id is not None}
    dependencies = session.exec(select(TaskDependency)).all()
    entries = session.exec(select(ContextEntry)).all()
    activities = session.exec(
        select(ActivityEvent).where(ActivityEvent.project_id == project_id)
    ).all()
    memberships = session.exec(
        select(ProjectMembership).where(ProjectMembership.project_id == project_id)
    ).all()

    bundle = ProjectExportBundle(
        project=ProjectSnapshot.model_validate(project.model_dump()),
        memberships=[
            ProjectMembershipSnapshot(
                user_id=membership.user_id,
                role=membership.role,
                created_at=membership.created_at,
            )
            for membership in memberships
        ],
        tasks=[TaskSnapshot.model_validate(task.model_dump()) for task in tasks],
        dependencies=[
            TaskDependencySnapshot.model_validate(dependency.model_dump())
            for dependency in dependencies
            if dependency.source_task_id in task_ids
            and dependency.target_task_id in task_ids
        ],
        context_entries=[
            ContextEntrySnapshot(
                task_id=entry.task_id,
                content=entry.content,
                entry_type=entry.entry_type,
                summary=entry.summary,
                what_changed=entry.what_changed,
                files_touched=entry.files_touched,
                decisions=entry.decisions,
                open_questions=entry.open_questions,
                next_step=entry.next_step,
                actor=entry.actor,
                source=entry.source,
                timestamp=entry.timestamp,
            )
            for entry in entries
            if entry.task_id in task_ids
        ],
        activity_events=[
            ActivityEventSnapshot(
                event_type=event.event_type,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                task_id=event.task_id,
                task_title=event.task_title,
                title=event.title,
                summary=event.summary,
                actor=event.actor,
                source=event.source,
                created_at=event.created_at,
            )
            for event in activities
        ],
    )
    return bundle


def create_project_backup(
    session: Session,
    project_id: str,
    user: UserContext,
) -> ProjectBackupResult:
    bundle = export_project_bundle(session, project_id, user)
    backup_dir = _backup_directory()
    backup_dir.mkdir(parents=True, exist_ok=True)

    backup_file = f"{project_id}-{bundle.exported_at.strftime('%Y%m%d%H%M%S')}.json"
    backup_path = backup_dir / backup_file
    backup_path.write_text(
        json.dumps(bundle.model_dump(mode="json"), indent=2),
        encoding="utf-8",
    )

    request_telemetry.emit_event(
        event_type="project.backup_created",
        project_id=project_id,
        detail=backup_file,
    )
    return ProjectBackupResult(
        project_id=project_id,
        backup_file=backup_file,
        backup_path=str(backup_path),
    )


def import_project_bundle(
    session: Session,
    payload: ProjectImportRequest,
    user: UserContext,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> ProjectImportResult:
    source_project = payload.bundle.project
    target_project_id = payload.target_project_id or source_project.id
    existing_project = session.get(Project, target_project_id)

    if existing_project and not payload.replace_existing:
        ensure_project_owner_or_admin(
            session, target_project_id, user, allow_archived=True
        )
        raise ConflictError(
            "Project already exists. Set replace_existing=true to overwrite it."
        )

    if existing_project:
        ensure_project_owner_or_admin(
            session, target_project_id, user, allow_archived=True
        )
        existing_tasks = session.exec(
            select(Task).where(Task.project_id == target_project_id)
        ).all()
        existing_task_ids = {task.id for task in existing_tasks if task.id is not None}
        if existing_task_ids:
            session.exec(
                delete(TaskDependency).where(
                    TaskDependency.source_task_id.in_(existing_task_ids)
                    | TaskDependency.target_task_id.in_(existing_task_ids)
                )
            )
            session.exec(
                delete(ContextEntry).where(ContextEntry.task_id.in_(existing_task_ids))
            )
        session.exec(
            delete(ActivityEvent).where(ActivityEvent.project_id == target_project_id)
        )
        session.exec(
            delete(ProjectMembership).where(
                ProjectMembership.project_id == target_project_id
            )
        )
        session.exec(delete(Task).where(Task.project_id == target_project_id))
        session.exec(delete(Project).where(Project.id == target_project_id))
        session.flush()

    imported_project = Project(
        id=target_project_id,
        name=source_project.name,
        description=source_project.description,
        owner_user_id=user.user_id,
        archived=source_project.archived,
        created_at=source_project.created_at or source_project.created_at,
    )
    session.add(imported_project)
    session.flush()

    old_to_new_task_ids: dict[int, int] = {}
    imported_task_count = 0
    imported_context_count = 0
    imported_dependency_count = 0
    imported_activity_count = 0
    imported_membership_count = 0

    if payload.include_memberships:
        for membership in payload.bundle.memberships:
            if membership.user_id == imported_project.owner_user_id:
                continue
            session.add(
                ProjectMembership(
                    project_id=target_project_id,
                    user_id=membership.user_id,
                    role=membership.role,
                    created_at=membership.created_at,
                )
            )
            imported_membership_count += 1

    session.add(
        ProjectMembership(
            project_id=target_project_id, user_id=user.user_id, role="owner"
        )
    )

    for task_snapshot in payload.bundle.tasks:
        task = Task(
            title=task_snapshot.title,
            description=task_snapshot.description,
            status=task_snapshot.status,
            priority=task_snapshot.priority,
            labels=task_snapshot.labels,
            project_id=target_project_id,
            archived=task_snapshot.archived,
            created_at=task_snapshot.created_at or imported_project.created_at,
        )
        session.add(task)
        session.flush()
        if task_snapshot.id is not None and task.id is not None:
            old_to_new_task_ids[task_snapshot.id] = task.id
        imported_task_count += 1

    for entry_snapshot in payload.bundle.context_entries:
        mapped_task_id = old_to_new_task_ids.get(entry_snapshot.task_id)
        if mapped_task_id is None:
            continue
        session.add(
            ContextEntry(
                task_id=mapped_task_id,
                content=entry_snapshot.content,
                entry_type=entry_snapshot.entry_type,
                summary=entry_snapshot.summary,
                what_changed=entry_snapshot.what_changed,
                files_touched=entry_snapshot.files_touched,
                decisions=entry_snapshot.decisions,
                open_questions=entry_snapshot.open_questions,
                next_step=entry_snapshot.next_step,
                actor=entry_snapshot.actor,
                source=entry_snapshot.source,
                timestamp=entry_snapshot.timestamp or imported_project.created_at,
            )
        )
        imported_context_count += 1

    task_title_by_new_id = {
        task.id: task.title
        for task in session.exec(
            select(Task).where(Task.project_id == target_project_id)
        ).all()
        if task.id is not None
    }

    for dependency_snapshot in payload.bundle.dependencies:
        source_task_id = old_to_new_task_ids.get(dependency_snapshot.source_task_id)
        target_task_id = old_to_new_task_ids.get(dependency_snapshot.target_task_id)
        if source_task_id is None or target_task_id is None:
            continue
        session.add(
            TaskDependency(
                source_task_id=source_task_id,
                target_task_id=target_task_id,
                type=dependency_snapshot.type,
                source_handle=dependency_snapshot.source_handle,
                target_handle=dependency_snapshot.target_handle,
            )
        )
        imported_dependency_count += 1

    for event_snapshot in payload.bundle.activity_events:
        mapped_task_id = (
            old_to_new_task_ids.get(event_snapshot.task_id)
            if event_snapshot.task_id is not None
            else None
        )
        session.add(
            ActivityEvent(
                event_type=event_snapshot.event_type,
                entity_type=event_snapshot.entity_type,
                entity_id=event_snapshot.entity_id,
                task_id=mapped_task_id,
                task_title=(
                    task_title_by_new_id.get(mapped_task_id)
                    if mapped_task_id is not None
                    else event_snapshot.task_title
                ),
                title=event_snapshot.title,
                summary=event_snapshot.summary,
                actor=event_snapshot.actor,
                source=event_snapshot.source,
                project_id=target_project_id,
                created_at=event_snapshot.created_at or imported_project.created_at,
            )
        )
        imported_activity_count += 1

    record_activity(
        session,
        event_type="project.imported",
        entity_type="project",
        title=f'Imported project "{imported_project.name}"',
        summary=truncate(
            f"Imported {imported_task_count} tasks, {imported_dependency_count} dependencies, and {imported_context_count} context entries."
        ),
        actor=actor,
        source=source,
        project_id=target_project_id,
    )
    session.commit()

    request_telemetry.emit_event(
        event_type="project.imported",
        project_id=target_project_id,
        detail=f"tasks={imported_task_count}",
    )
    return ProjectImportResult(
        project_id=target_project_id,
        replaced_existing=existing_project is not None,
        imported_task_count=imported_task_count,
        imported_dependency_count=imported_dependency_count,
        imported_context_entry_count=imported_context_count,
        imported_activity_event_count=imported_activity_count,
        imported_membership_count=imported_membership_count + 1,
    )
