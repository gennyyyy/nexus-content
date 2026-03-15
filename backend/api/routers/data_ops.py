from fastapi import APIRouter

from ...api.dependencies import SessionDep, UserDep
from ...domain.models import (
    ProjectBackupResult,
    ProjectExportBundle,
    ProjectImportRequest,
    ProjectImportResult,
)
from ...services.data_ops import (
    create_project_backup,
    export_project_bundle,
    import_project_bundle,
)

router = APIRouter(tags=["data-ops"])


@router.get("/api/projects/{project_id}/export", response_model=ProjectExportBundle)
def export_project_endpoint(project_id: str, session: SessionDep, user: UserDep):
    return export_project_bundle(session, project_id, user)


@router.post("/api/projects/import", response_model=ProjectImportResult)
def import_project_endpoint(
    payload: ProjectImportRequest,
    session: SessionDep,
    user: UserDep,
):
    return import_project_bundle(session, payload, user)


@router.post("/api/projects/{project_id}/backup", response_model=ProjectBackupResult)
def backup_project_endpoint(project_id: str, session: SessionDep, user: UserDep):
    return create_project_backup(session, project_id, user)
