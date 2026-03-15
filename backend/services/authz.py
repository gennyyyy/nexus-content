from sqlmodel import Session, select

from ..domain.models import Project, ProjectMembership, UserContext
from .errors import ForbiddenError, NotFoundError


def ensure_project_access(
    session: Session,
    project_id: str | None,
    user: UserContext,
    *,
    allow_archived: bool = False,
) -> Project | None:
    if project_id is None:
        return None

    project = session.get(Project, project_id)
    if not project:
        raise NotFoundError("Project not found")
    if project.archived and not allow_archived:
        raise ForbiddenError("Project is archived")
    if user.role == "admin":
        return project
    if project.owner_user_id == user.user_id:
        return project

    membership = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user.user_id,
        )
    ).first()
    if not membership:
        raise ForbiddenError("You do not have access to this project")
    return project


def ensure_project_owner_or_admin(
    session: Session,
    project_id: str,
    user: UserContext,
    *,
    allow_archived: bool = True,
) -> Project:
    project = ensure_project_access(
        session,
        project_id,
        user,
        allow_archived=allow_archived,
    )
    if project is None:
        raise NotFoundError("Project not found")
    if user.role == "admin" or project.owner_user_id == user.user_id:
        return project

    membership = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user.user_id,
        )
    ).first()
    if membership and membership.role == "owner":
        return project
    raise ForbiddenError("Only project owners can change this project")
