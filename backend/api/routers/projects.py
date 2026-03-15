from fastapi import APIRouter

from ...api.dependencies import SessionDep, UserDep
from ...domain.models import (
    Project,
    ProjectArchiveUpdate,
    ProjectCreate,
    ProjectMembership,
    ProjectMembershipCreate,
)
from ...services.projects import (
    create_project,
    get_project,
    list_project_memberships,
    list_projects,
    update_project_archive_state,
    upsert_project_membership,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[Project])
def read_projects(
    session: SessionDep,
    user: UserDep,
    include_archived: bool = False,
):
    return list_projects(session, user, include_archived=include_archived)


@router.post("", response_model=Project)
def create_project_endpoint(project: ProjectCreate, session: SessionDep, user: UserDep):
    return create_project(session, project, user)


@router.get("/{project_id}", response_model=Project)
def read_project(project_id: str, session: SessionDep, user: UserDep):
    return get_project(session, project_id, user)


@router.patch("/{project_id}/archive", response_model=Project)
def archive_project_endpoint(
    project_id: str,
    archive_update: ProjectArchiveUpdate,
    session: SessionDep,
    user: UserDep,
):
    return update_project_archive_state(session, project_id, archive_update, user)


@router.get("/{project_id}/memberships", response_model=list[ProjectMembership])
def read_project_memberships(project_id: str, session: SessionDep, user: UserDep):
    return list_project_memberships(session, project_id, user)


@router.post("/{project_id}/memberships", response_model=ProjectMembership)
def upsert_project_membership_endpoint(
    project_id: str,
    membership: ProjectMembershipCreate,
    session: SessionDep,
    user: UserDep,
):
    return upsert_project_membership(session, project_id, membership, user)
