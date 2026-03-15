import re

from sqlmodel import Session, select

from ..domain.models import (
    Project,
    ProjectArchiveUpdate,
    ProjectCreate,
    ProjectMembership,
    ProjectMembershipCreate,
    Task,
    UserContext,
)
from .activity import record_activity, truncate
from .errors import ConflictError, NotFoundError, ValidationError
from .authz import ensure_project_access, ensure_project_owner_or_admin

PROJECT_ID_PATTERN = re.compile(r"^[a-z0-9-]+$")


def list_projects(
    session: Session,
    user: UserContext,
    *,
    include_archived: bool = False,
) -> list[Project]:
    project_records = session.exec(select(Project)).all()
    project_rows = [
        project
        for project in project_records
        if (include_archived or not project.archived)
        and (
            user.role == "admin"
            or project.owner_user_id == user.user_id
            or session.exec(
                select(ProjectMembership).where(
                    ProjectMembership.project_id == project.id,
                    ProjectMembership.user_id == user.user_id,
                )
            ).first()
        )
    ]
    projects_by_id: dict[str, Project] = {
        project.id: project for project in project_rows
    }

    legacy_rows = session.exec(select(Task.project_id).distinct()).all()
    legacy_project_ids = [project_id for project_id in legacy_rows]
    for project_id in legacy_project_ids:
        if not project_id or project_id in projects_by_id:
            continue
        projects_by_id[project_id] = Project(
            id=project_id,
            name=project_id.replace("-", " ").title(),
            description="Imported from existing tasks",
            owner_user_id=user.user_id,
        )

    return sorted(
        projects_by_id.values(), key=lambda project: project.created_at, reverse=True
    )


def create_project(
    session: Session,
    project: ProjectCreate,
    user: UserContext,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> Project:
    if not PROJECT_ID_PATTERN.fullmatch(project.id):
        raise ValidationError(
            "Project ID must use lowercase letters, numbers, and hyphens only"
        )

    existing = session.get(Project, project.id)
    if existing:
        raise ConflictError("Project already exists")

    db_project = Project.model_validate(
        {**project.model_dump(), "owner_user_id": user.user_id}
    )
    session.add(db_project)
    session.flush()
    session.add(
        ProjectMembership(project_id=db_project.id, user_id=user.user_id, role="owner")
    )
    record_activity(
        session,
        event_type="project.created",
        entity_type="project",
        title=f'Created project "{db_project.name}"',
        summary=truncate(db_project.description or "Project initialized."),
        actor=actor,
        source=source,
        project_id=db_project.id,
    )
    session.commit()
    session.refresh(db_project)
    return db_project


def get_project(session: Session, project_id: str, user: UserContext) -> Project:
    project = session.get(Project, project_id)
    if project:
        ensure_project_access(session, project_id, user, allow_archived=True)
        return project

    has_tasks = session.exec(
        select(Task.id).where(Task.project_id == project_id).limit(1)
    ).first()
    if not has_tasks:
        raise NotFoundError("Project not found")

    return Project(
        id=project_id,
        name=project_id.replace("-", " ").title(),
        description="Imported from existing tasks",
        owner_user_id=user.user_id,
    )


def update_project_archive_state(
    session: Session,
    project_id: str,
    archive_update: ProjectArchiveUpdate,
    user: UserContext,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> Project:
    project = ensure_project_owner_or_admin(session, project_id, user)
    if project.archived == archive_update.archived:
        return project

    project.archived = archive_update.archived
    session.add(project)
    record_activity(
        session,
        event_type="project.archived"
        if archive_update.archived
        else "project.unarchived",
        entity_type="project",
        title=(
            f'Archived project "{project.name}"'
            if archive_update.archived
            else f'Unarchived project "{project.name}"'
        ),
        summary=truncate(project.description or "Updated project archive state."),
        actor=actor,
        source=source,
        project_id=project.id,
    )
    session.commit()
    session.refresh(project)
    return project


def list_project_memberships(
    session: Session, project_id: str, user: UserContext
) -> list[ProjectMembership]:
    ensure_project_access(session, project_id, user, allow_archived=True)
    rows = session.exec(
        select(ProjectMembership).where(ProjectMembership.project_id == project_id)
    ).all()
    return [membership for membership in rows]


def upsert_project_membership(
    session: Session,
    project_id: str,
    membership: ProjectMembershipCreate,
    user: UserContext,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> ProjectMembership:
    project = ensure_project_owner_or_admin(
        session, project_id, user, allow_archived=True
    )

    existing = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == membership.user_id,
        )
    ).first()

    if existing:
        existing.role = membership.role
        db_membership = existing
    else:
        db_membership = ProjectMembership(
            project_id=project_id,
            user_id=membership.user_id,
            role=membership.role,
        )
    session.add(db_membership)
    record_activity(
        session,
        event_type="project.membership_updated",
        entity_type="project-membership",
        entity_id=db_membership.id,
        title=f'Updated access for "{project.name}"',
        summary=f"Assigned {membership.role} access to {membership.user_id}.",
        actor=actor,
        source=source,
        project_id=project.id,
    )
    session.commit()
    session.refresh(db_membership)
    return db_membership


def delete_project_membership(
    session: Session,
    project_id: str,
    user_id: str,
    user: UserContext,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> None:
    project = ensure_project_owner_or_admin(
        session, project_id, user, allow_archived=True
    )

    if user_id == project.owner_user_id:
        raise ValidationError("The project creator cannot be removed")

    membership = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
    ).first()
    if not membership:
        raise NotFoundError("Project membership not found")

    if membership.role == "owner":
        remaining_owner = session.exec(
            select(ProjectMembership).where(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id != user_id,
                ProjectMembership.role == "owner",
            )
        ).first()
        if remaining_owner is None and user.role != "admin":
            raise ValidationError(
                "Add another owner before removing the last delegated owner"
            )

    record_activity(
        session,
        event_type="project.membership_removed",
        entity_type="project-membership",
        entity_id=membership.id,
        title=f'Removed access for "{project.name}"',
        summary=f"Removed {membership.role} access from {membership.user_id}.",
        actor=actor,
        source=source,
        project_id=project.id,
    )
    session.delete(membership)
    session.commit()
