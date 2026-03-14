from fastapi import APIRouter

from ...api.dependencies import SessionDep
from ...domain.models import (
    ActivityEvent,
    ControlCenterSnapshot,
    TaskMemorySummary,
    TaskOperationalState,
    WorkspaceSnapshot,
)
from ...services.context import list_memory_overview
from ...services.views import (
    get_control_center_snapshot,
    get_workspace_snapshot,
    list_activity_events,
    list_task_operational_states,
)

router = APIRouter(tags=["views"])


@router.get("/api/memory", response_model=list[TaskMemorySummary])
def read_memory_overview(session: SessionDep, project_id: str | None = None):
    return list_memory_overview(session, project_id)


@router.get("/api/task-states", response_model=list[TaskOperationalState])
def read_task_operational_states(session: SessionDep, project_id: str | None = None):
    return list_task_operational_states(session, project_id)


@router.get("/api/workspace", response_model=WorkspaceSnapshot)
def read_workspace_snapshot(session: SessionDep, project_id: str | None = None):
    return get_workspace_snapshot(session, project_id)


@router.get("/api/control-center", response_model=ControlCenterSnapshot)
def read_control_center_snapshot(session: SessionDep, project_id: str | None = None):
    return get_control_center_snapshot(session, project_id)


@router.get("/api/activity", response_model=list[ActivityEvent])
def read_activity_feed(
    session: SessionDep, limit: int = 60, project_id: str | None = None
):
    return list_activity_events(session, limit, project_id)
