from fastapi import APIRouter

from ...api.dependencies import SessionDep
from ...domain.models import Project, ProjectCreate
from ...services.projects import create_project, get_project, list_projects

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[Project])
def read_projects(session: SessionDep):
    return list_projects(session)


@router.post("", response_model=Project)
def create_project_endpoint(project: ProjectCreate, session: SessionDep):
    return create_project(session, project)


@router.get("/{project_id}", response_model=Project)
def read_project(project_id: str, session: SessionDep):
    return get_project(session, project_id)
