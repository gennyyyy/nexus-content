from fastapi import APIRouter

from ...api.dependencies import SessionDep, UserDep
from ...domain.models import (
    ActivityEvent,
    ContextEntry,
    ContextEntryCreate,
    ResumePacket,
    Task,
    TaskArchiveUpdate,
    TaskCreate,
    TaskMemorySummary,
    TaskUpdate,
)
from ...services.context import (
    create_task_context,
    get_task_memory_summary,
    get_task_resume_packet,
    list_task_context,
)
from ...services.tasks import (
    create_task,
    delete_task,
    list_tasks,
    update_task,
    update_task_archive_state,
)
from ...services.views import list_task_activity_events

router = APIRouter(tags=["tasks"])


@router.get("/api/tasks", response_model=list[Task])
def read_tasks(
    session: SessionDep,
    user: UserDep,
    project_id: str | None = None,
    include_archived: bool = False,
):
    return list_tasks(
        session,
        project_id,
        user,
        include_archived=include_archived,
    )


@router.post("/api/tasks", response_model=Task)
def create_task_endpoint(task: TaskCreate, session: SessionDep, user: UserDep):
    return create_task(session, **task.model_dump(), user=user)


@router.put("/api/tasks/{task_id}", response_model=Task)
def update_task_endpoint(
    task_id: int, task_update: TaskUpdate, session: SessionDep, user: UserDep
):
    return update_task(session, task_id, task_update, user=user)


@router.delete("/api/tasks/{task_id}")
def delete_task_endpoint(task_id: int, session: SessionDep, user: UserDep):
    delete_task(session, task_id, user=user)
    return {"ok": True}


@router.patch("/api/tasks/{task_id}/archive", response_model=Task)
def archive_task_endpoint(
    task_id: int,
    archive_update: TaskArchiveUpdate,
    session: SessionDep,
    user: UserDep,
):
    return update_task_archive_state(session, task_id, archive_update, user)


@router.get("/api/tasks/{task_id}/context", response_model=list[ContextEntry])
def read_task_context(
    task_id: int,
    session: SessionDep,
    user: UserDep,
    project_id: str | None = None,
):
    return list_task_context(session, task_id, project_id, user=user)


@router.post("/api/tasks/{task_id}/context", response_model=ContextEntry)
def create_task_context_endpoint(
    task_id: int,
    entry: ContextEntryCreate,
    session: SessionDep,
    user: UserDep,
    project_id: str | None = None,
):
    return create_task_context(
        session, task_id, entry, project_id=project_id, user=user
    )


@router.get("/api/tasks/{task_id}/memory", response_model=TaskMemorySummary)
def read_task_memory(
    task_id: int,
    session: SessionDep,
    user: UserDep,
    project_id: str | None = None,
):
    return get_task_memory_summary(session, task_id, project_id, user=user)


@router.get("/api/tasks/{task_id}/resume-packet", response_model=ResumePacket)
def read_task_resume_packet(
    task_id: int,
    session: SessionDep,
    user: UserDep,
    project_id: str | None = None,
):
    return get_task_resume_packet(session, task_id, project_id, user=user)


@router.get("/api/tasks/{task_id}/activity", response_model=list[ActivityEvent])
def read_task_activity(
    task_id: int,
    session: SessionDep,
    user: UserDep,
    limit: int = 60,
    project_id: str | None = None,
):
    return list_task_activity_events(session, task_id, limit, project_id, user=user)
